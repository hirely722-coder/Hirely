import { Hono } from 'hono';
import crypto from 'crypto';
import { supabase } from '../db';
import { keysToCamel } from '../utils';
import { getRazorpayClient, verifyPaymentSignature } from '../services/payment.service';

export const paymentRouter = new Hono<{
  Variables: {
    user: any;
  }
}>();

// Razorpay Payments integration
paymentRouter.post('/payments/create-order', async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const { planSlug, cycle } = body;
    const isYearly = cycle === 'yearly';

    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', planSlug)
      .single();

    if (planError || !plan) {
      return c.json({ error: 'Invalid subscription plan selected.' }, 400);
    }

    const amountInRupees = isYearly 
      ? parseFloat(plan.yearly_price || '0') 
      : parseFloat(plan.monthly_price || '0');
    const amountInPaise = Math.round(amountInRupees * 100);

    if (amountInPaise < 100) {
      return c.json({ error: 'Minimum amount must be at least ₹1 (100 paise).' }, 400);
    }

    const razorpay = getRazorpayClient();

    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${user.workspace_id.slice(0, 8)}_${Date.now().toString().slice(-8)}`,
      notes: {
        workspace_id: user.workspace_id,
        plan_slug: planSlug,
        billing_cycle: cycle || 'monthly'
      }
    };

    const order = await razorpay.orders.create(orderOptions);

    return c.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create order' }, 500);
  }
});

paymentRouter.post('/payments/verify-payment', async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, planSlug, cycle } = body;

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature || !planSlug) {
      return c.json({ error: 'Missing required payment verification fields.' }, 400);
    }

    const isVerified = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isVerified) {
      return c.json({ error: 'Payment signature mismatch. Transaction not verified.' }, 400);
    }

    // Update workspace plan in Database
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', planSlug)
      .single();

    if (planError || !plan) {
      return c.json({ error: 'Invalid subscription plan selected.' }, 400);
    }

    const isYearly = cycle === 'yearly';
    const renewalDate = new Date();
    if (isYearly) {
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    const { data: updatedWorkspace, error: updateError } = await supabase
      .from('workspaces')
      .update({
        subscription_plan: planSlug,
        subscription_type: 'paid',
        is_trial: false,
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        renewal_date: renewalDate.toISOString(),
        plan_id: plan.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.workspace_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Insert billing transaction log for SaaS operations audit
    try {
      await supabase
        .from('superadmin_payments')
        .insert([{
          agency_id: user.workspace_id,
          plan_name: plan.name,
          amount: parseFloat(plan.monthly_price || '0'),
          currency: plan.currency || 'INR',
          status: 'Paid'
        }]);

      await supabase
        .from('billing_transactions')
        .insert([{
          id: razorpayPaymentId,
          workspace_id: user.workspace_id,
          amount: parseFloat(plan.monthly_price || '0') * 100, // paise (cents)
          currency: plan.currency || 'INR',
          status: 'captured',
          event_type: 'payment.captured',
          plan_slug: planSlug
        }]);
    } catch (payLogErr: any) {
      console.error('[verify-payment] Failed to insert payment audit log:', payLogErr.message);
    }

    return c.json({ success: true, workspace: keysToCamel(updatedWorkspace) });
  } catch (err: any) {
    return c.json({ error: err.message || 'Payment verification failed' }, 500);
  }
});

paymentRouter.post('/payments/webhook', async (c) => {
  try {
    const signature = c.req.header('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Webhook Secret is not configured in environment variables');
      return c.json({ error: 'Webhook configuration error' }, 500);
    }

    if (!signature) {
      return c.json({ error: 'Missing signature header' }, 400);
    }

    const rawBody = await c.req.text();

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );

    if (!isSignatureValid) {
      console.warn('Webhook signature verification failed');
      return c.json({ error: 'Signature mismatch' }, 400);
    }

    const body = JSON.parse(rawBody);
    const event = body.event;
    
    console.log(`Received Razorpay webhook event: ${event}`);

    if (event === 'order.paid' || event === 'payment.captured') {
      const entity = event === 'order.paid' ? body.payload.order.entity : body.payload.payment.entity;
      const notes = entity.notes || {};
      const workspaceId = notes.workspace_id;
      const planSlug = notes.plan_slug;

      if (!workspaceId || !planSlug) {
        console.warn('Missing workspace_id or plan_slug in order/payment notes');
        return c.json({ status: 'ok', warning: 'No action taken due to missing metadata notes' }, 200);
      }

      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('slug', planSlug)
        .single();

      if (planError || !plan) {
        console.error(`Invalid plan slug received in webhook notes: ${planSlug}`);
        return c.json({ status: 'ok', error: 'Invalid plan' }, 200);
      }

      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + 1);

      // Perform update on workspaces table
      const { error: updateError } = await supabase
        .from('workspaces')
        .update({
          subscription_plan: planSlug,
          subscription_type: 'paid',
          is_trial: false,
          subscription_status: 'active',
          subscription_start_date: new Date().toISOString(),
          renewal_date: renewalDate.toISOString(),
          plan_id: plan.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', workspaceId);

      if (updateError) {
        console.error(`Database error updating workspace ${workspaceId} via webhook:`, updateError);
        throw updateError;
      }

      // Log transaction record in database
      const paymentId = event === 'payment.captured' ? entity.id : (entity.payment_id || `pay_order_${entity.id}`);
      await supabase
        .from('billing_transactions')
        .insert({
          id: paymentId,
          workspace_id: workspaceId,
          amount: entity.amount,
          currency: entity.currency || 'INR',
          status: 'captured',
          event_type: event,
          plan_slug: planSlug
        });

      console.log(`Workspace ${workspaceId} successfully upgraded via Webhook to ${planSlug}`);
    } 
    
    else if (event === 'subscription.charged') {
      const paymentEntity = body.payload.payment.entity;
      const subscriptionEntity = body.payload.subscription.entity;
      const notes = subscriptionEntity.notes || paymentEntity.notes || {};
      const workspaceId = notes.workspace_id;
      const planSlug = notes.plan_slug || 'growth';

      if (workspaceId) {
        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + 1);

        await supabase
          .from('workspaces')
          .update({
            subscription_status: 'active',
            renewal_date: renewalDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', workspaceId);

        await supabase
          .from('billing_transactions')
          .insert({
            id: paymentEntity.id,
            workspace_id: workspaceId,
            amount: paymentEntity.amount,
            currency: paymentEntity.currency || 'INR',
            status: 'captured',
            event_type: 'subscription.charged',
            plan_slug: planSlug
          });

        console.log(`Workspace ${workspaceId} subscription successfully renewed via webhook.`);
      }
    } 
    
    else if (event === 'subscription.cancelled' || event === 'subscription.halted') {
      const subscriptionEntity = body.payload.subscription.entity;
      const notes = subscriptionEntity.notes || {};
      const workspaceId = notes.workspace_id;

      if (workspaceId) {
        await supabase
          .from('workspaces')
          .update({
            subscription_status: event === 'subscription.cancelled' ? 'cancelled' : 'expired',
            subscription_type: 'trial',
            is_trial: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', workspaceId);

        console.log(`Workspace ${workspaceId} subscription status set to inactive due to: ${event}`);
      }
    } 
    
    else if (event === 'refund.processed') {
      const refundEntity = body.payload.refund.entity;
      const originalPaymentId = refundEntity.payment_id;

      // Look up original transaction to find workspace_id
      const { data: originalTx } = await supabase
        .from('billing_transactions')
        .select('*')
        .eq('id', originalPaymentId)
        .single();

      if (originalTx) {
        await supabase
          .from('workspaces')
          .update({
            subscription_status: 'refunded',
            subscription_type: 'trial',
            is_trial: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', originalTx.workspace_id);

        await supabase
          .from('billing_transactions')
          .insert({
            id: refundEntity.id,
            workspace_id: originalTx.workspace_id,
            amount: refundEntity.amount,
            currency: refundEntity.currency || 'INR',
            status: 'refunded',
            event_type: 'refund.processed',
            plan_slug: originalTx.plan_slug
          });

        console.log(`Workspace ${originalTx.workspace_id} subscription refunded successfully.`);
      }
    } 
    
    else if (event === 'payment.dispute.created') {
      const disputeEntity = body.payload.dispute.entity;
      const originalPaymentId = disputeEntity.payment_id;

      const { data: originalTx } = await supabase
        .from('billing_transactions')
        .select('*')
        .eq('id', originalPaymentId)
        .single();

      if (originalTx) {
        await supabase
          .from('workspaces')
          .update({
            subscription_status: 'suspended',
            updated_at: new Date().toISOString()
          })
          .eq('id', originalTx.workspace_id);

        await supabase
          .from('billing_disputes')
          .insert({
            id: disputeEntity.id,
            payment_id: originalPaymentId,
            workspace_id: originalTx.workspace_id,
            amount: disputeEntity.amount,
            currency: disputeEntity.currency || 'INR',
            status: 'under_review',
            reason: disputeEntity.reason_code
          });

        console.log(`Workspace ${originalTx.workspace_id} suspended due to active payment dispute.`);
      }
    } 
    
    else if (event === 'payment.dispute.lost') {
      const disputeEntity = body.payload.dispute.entity;
      const originalPaymentId = disputeEntity.payment_id;

      const { data: originalTx } = await supabase
        .from('billing_transactions')
        .select('*')
        .eq('id', originalPaymentId)
        .single();

      if (originalTx) {
        await supabase
          .from('workspaces')
          .update({
            subscription_status: 'expired',
            subscription_type: 'trial',
            is_trial: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', originalTx.workspace_id);

        await supabase
          .from('billing_disputes')
          .update({
            status: 'lost',
            updated_at: new Date().toISOString()
          })
          .eq('id', disputeEntity.id);

        console.log(`Workspace ${originalTx.workspace_id} downgraded permanently after lost dispute.`);
      }
    }

    return c.json({ status: 'ok' }, 200);
  } catch (err: any) {
    console.error('Error handling webhook:', err);
    return c.json({ error: err.message || 'Webhook internal error' }, 500);
  }
});

paymentRouter.get('/admin/billing/subscriptions', async (c) => {
  const user = c.get('user') as any;
  if (!user || !user.is_super_admin) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('id, name, subscription_plan, subscription_status, subscription_type, is_trial, renewal_date, trial_expiry');

    const { data: transactions, error: txError } = await supabase
      .from('billing_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: disputes, error: dispError } = await supabase
      .from('billing_disputes')
      .select('*')
      .order('created_at', { ascending: false });

    if (wsError) throw wsError;
    if (txError) throw txError;
    if (dispError) throw dispError;

    return c.json(keysToCamel({
      workspaces: workspaces || [],
      transactions: transactions || [],
      disputes: disputes || []
    }));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

paymentRouter.post('/admin/billing/refund', async (c) => {
  const user = c.get('user') as any;
  if (!user || !user.is_super_admin) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const body = await c.req.json();
    const { paymentId, amount, reason } = body;

    if (!paymentId) {
      return c.json({ error: 'Missing paymentId parameter' }, 400);
    }

    const razorpay = getRazorpayClient();

    const refundOptions: any = {
      payment_id: paymentId,
      notes: {
        refund_reason: reason || 'Refunded by administrator'
      }
    };

    if (amount) {
      refundOptions.amount = Math.round(amount * 100);
    }

    const refund = await razorpay.payments.refund(paymentId, refundOptions);

    const { data: originalTx } = await supabase
      .from('billing_transactions')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (originalTx) {
      await supabase
        .from('workspaces')
        .update({
          subscription_status: 'refunded',
          subscription_type: 'trial',
          is_trial: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', originalTx.workspace_id);

      await supabase
        .from('billing_transactions')
        .insert({
          id: refund.id,
          workspace_id: originalTx.workspace_id,
          amount: refund.amount,
          currency: refund.currency || 'INR',
          status: 'refunded',
          event_type: 'admin.refund',
          plan_slug: originalTx.plan_slug
        });
    }

    return c.json({ success: true, refundId: refund.id });
  } catch (err: any) {
    return c.json({ error: err.message || 'Refund failed' }, 500);
  }
});
