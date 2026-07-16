import { Hono } from 'hono';
import nodemailer from 'nodemailer';
import { supabase } from '../db';
import { WorkspaceRepository } from '../repository';
import { requirePermission } from '../middleware/auth';
import { keysToCamel, keysToSnake } from '../utils';
import { sendEmailViaOAuth } from '../email_integration_routes';
import { EmailIntegrationDB } from '../email_integration_db';

export const workspaceRouter = new Hono<{
  Variables: {
    user: any;
  }
}>();

// Unified Ingestion Bootstrapping helper
async function fetchAllTableData(tableName: string, workspaceId: string) {
  let allData: any[] = [];
  let start = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .range(start, start + limit - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allData.push(...data);
      if (data.length < limit) {
        hasMore = false;
      } else {
        start += limit;
      }
    }
  }
  return keysToCamel(allData);
}

workspaceRouter.get('/bootstrap', async (c) => {
  const user = c.get('user') as any;
  try {
    let [
      companies,
      jobs,
      candidates,
      tasks,
      emailTemplates,
      activityLogs,
      teamMembers,
      communicationLogs,
      emailConfig,
      customFieldDefinitions,
      workspaceRoles,
      workspaceData,
      rbacAuditLogs,
      companyContacts,
      companyDocuments,
      companyNotes
    ] = await Promise.all([
      new WorkspaceRepository('companies', user).getAll(),
      new WorkspaceRepository('jobs', user).getAll(),
      new WorkspaceRepository('candidates', user).getAll(),
      new WorkspaceRepository('tasks', user).getAll(),
      new WorkspaceRepository('email_templates', user).getAll(),
      new WorkspaceRepository('activity_logs', user).getAll(),
      supabase.from('profiles').select('*').eq('workspace_id', user.workspace_id).then(({ data, error }) => {
        if (error) throw error;
        return keysToCamel(data || []);
      }),
      new WorkspaceRepository('communication_logs', user).getAll(),
      supabase.from('email_configs').select('*').eq('workspace_id', user.workspace_id).single().then(({ data, error }) => {
        if (error && error.code !== 'PGRST116') throw error;
        return data ? keysToCamel(data) : { provider: 'Gmail', isConnected: false };
      }),
      fetchAllTableData('custom_field_definitions', user.workspace_id),
      supabase.from('workspace_roles').select('*').eq('workspace_id', user.workspace_id).then(({ data }) => keysToCamel(data || [])),
      supabase.from('workspaces').select('id, name, slug, created_at, locked_features, recruiter_assignment_strategy, show_workload_limit_to_recruiters').eq('id', user.workspace_id).single().then(({ data }) => keysToCamel(data || {})),
      supabase.from('rbac_audit_logs').select('*').eq('workspace_id', user.workspace_id).order('timestamp', { ascending: false }).then(({ data }) => keysToCamel(data || [])),
      new WorkspaceRepository('company_contacts', user).getAll(),
      new WorkspaceRepository('company_documents', user).getAll(),
      new WorkspaceRepository('company_notes', user).getAll()
    ]);

    // If the workspace has zero email templates, auto-seed them from the default system templates or fallback prebuilts
    if (emailTemplates.length === 0) {
      const { data: defaultTemplates, error: defaultError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('workspace_id', '00000000-0000-0000-0000-000000000000');
      
      let templatesToInsert: any[] = [];
      if (!defaultError && defaultTemplates && defaultTemplates.length > 0) {
        const { randomUUID } = await import('crypto');
        templatesToInsert = defaultTemplates.map(t => ({
          id: randomUUID(),
          workspace_id: user.workspace_id,
          created_by: user.id,
          updated_by: user.id,
          name: t.name,
          category: t.category,
          subject: t.subject,
          body: t.body,
          variables: t.variables,
          audience: t.audience,
          last_updated: t.last_updated
        }));
      } else {
        // Fallback: Premium prebuilt email templates
        const { randomUUID } = await import('crypto');
        const defaultPrebuiltTemplates = [
          {
            name: 'Interview Scheduled',
            category: 'Interview',
            subject: 'Interview Scheduled: {{jobTitle}} with {{companyName}}',
            body: `Hi {{candidateName}},\n\nI am pleased to confirm that your next interview for the {{jobTitle}} position at {{companyName}} has been scheduled.\n\nOur team is excited to meet with you and discuss your experience further. Let me know if you have any questions before the chat!\n\nBest regards,\n{{recruiterName}}`,
            variables: ['candidateName', 'jobTitle', 'companyName', 'recruiterName'],
            audience: 'Candidate'
          },
          {
            name: 'Offer Letter Announcement',
            category: 'Offer',
            subject: 'Job Offer: {{jobTitle}} at {{companyName}}!',
            body: `Dear {{candidateName}},\n\nWe are absolutely thrilled to extend an offer of employment for the {{jobTitle}} position with {{companyName}}.\n\nWe were incredibly impressed by your interviews, skills, and approach. We are confident you will make a huge impact here.\n\nPlease find the detailed offer letter attached. We look forward to welcoming you to the team!\n\nWarmly,\n{{recruiterName}}`,
            variables: ['candidateName', 'jobTitle', 'companyName', 'recruiterName'],
            audience: 'Candidate'
          },
          {
            name: 'Application Acknowledgment',
            category: 'Outreach',
            subject: 'We have received your application for {{jobTitle}}',
            body: `Hi {{candidateName}},\n\nThank you for applying to the {{jobTitle}} position at {{companyName}}.\n\nOur recruiting team is currently reviewing candidate profiles and qualifications. We will get back to you shortly regarding the next steps in our hiring process.\n\nBest regards,\n{{recruiterName}}`,
            variables: ['candidateName', 'jobTitle', 'companyName', 'recruiterName'],
            audience: 'Candidate'
          },
          {
            name: 'Application Update (Feedback)',
            category: 'Follow-up',
            subject: 'Application Update: {{jobTitle}}',
            body: `Hi {{candidateName}},\n\nThank you for taking the time to discuss the {{jobTitle}} position at {{companyName}} with us.\n\nWhile we were impressed by your background and skills, we have decided to move forward with other candidates whose experience more closely aligns with our current needs. We will keep your profile in our talent pool for future opportunities.\n\nBest regards,\n{{recruiterName}}`,
            variables: ['candidateName', 'jobTitle', 'companyName', 'recruiterName'],
            audience: 'Candidate'
          },
          {
            name: 'Candidate Profile Submission',
            category: 'Submission',
            subject: 'Hirly Candidate Submission: {{candidateName}} for {{jobTitle}}',
            body: `Hi {{contactPerson}},\n\nI hope you are doing well!\n\nI am pleased to submit {{candidateName}}'s profile for the {{jobTitle}} role at {{companyName}}.\n\nAfter reviewing their technical skills and background, we find them to be an excellent match. They have solid experience with your core tech stack and have expressed strong interest in {{companyName}}.\n\nPlease find their CV attached. Let me know if you would like us to schedule a discussion with them.\n\nBest regards,\n{{recruiterName}}`,
            variables: ['contactPerson', 'candidateName', 'jobTitle', 'companyName', 'recruiterName'],
            audience: 'Company'
          },
          {
            name: 'Sourcing & Assessment Update',
            category: 'Follow-up',
            subject: 'Weekly Sourcing Pipeline Update for {{companyName}}',
            body: `Hi {{contactPerson}},\n\nI hope your week is off to a great start!\n\nI wanted to share a quick update on our search progress for your {{jobTitle}} position.\n\nCurrently, we have candidates undergoing our technical screening and live coding assessments. We expect to share a vetted shortlist with you by the end of this week.\n\nLet me know if there are any adjustments in the role scope!\n\nBest regards,\n{{recruiterName}}`,
            variables: ['contactPerson', 'jobTitle', 'companyName', 'recruiterName'],
            audience: 'Company'
          },
          {
            name: 'New Position Intake Meeting',
            category: 'Screening',
            subject: 'Intake Discussion: Sourcing strategy for {{jobTitle}}',
            body: `Hi {{contactPerson}},\n\nThanks for choosing Hirly to assist with your expansion plans. To ensure we target the exact right profile, I'd love to schedule a brief 15-minute Intake Meeting to discuss your {{jobTitle}} requirements.\n\nDuring this call, we'll align on tech stack nuances, team culture, salary expectations, and interview stages.\n\nDo you have availability for a brief call tomorrow or the day after?\n\nBest regards,\n{{recruiterName}}`,
            variables: ['contactPerson', 'jobTitle', 'recruiterName'],
            audience: 'Company'
          }
        ];

        templatesToInsert = defaultPrebuiltTemplates.map(t => ({
          id: randomUUID(),
          workspace_id: user.workspace_id,
          created_by: user.id,
          updated_by: user.id,
          name: t.name,
          category: t.category,
          subject: t.subject,
          body: t.body,
          variables: t.variables,
          audience: t.audience,
          last_updated: new Date().toISOString().split('T')[0]
        }));
      }

      if (templatesToInsert.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('email_templates')
          .insert(templatesToInsert)
          .select();

        if (!insertError && insertedData) {
          emailTemplates = keysToCamel(insertedData);
        } else if (insertError) {
          console.error('[Bootstrap Email Templates Seeding Error]', insertError.message);
        }
      }
    }

    // Calculate AI requests in the current billing cycle
    let sinceDate = new Date();
    sinceDate.setDate(1);
    sinceDate.setHours(0, 0, 0, 0);
    
    if (user.renewal_date) {
      const ren = new Date(user.renewal_date);
      const now = new Date();
      try {
        while (ren > now) {
          ren.setMonth(ren.getMonth() - 1);
        }
        sinceDate = ren;
      } catch (e) {}
    }

    const { count: aiRequestsCount } = await supabase
      .from('superadmin_ai_logs')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', user.workspace_id)
      .gte('timestamp', sinceDate.toISOString());

    // Trigger trial reminder email if trial is active and close to expiration
    if (user.is_trial && user.subscription_status === 'active' && user.trial_end_date) {
      const trialEnd = new Date(user.trial_end_date);
      const diffMs = trialEnd.getTime() - Date.now();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      
      if (daysRemaining <= 3) {
        const triggerLabel = daysRemaining === 0 ? 'expires today' : `${daysRemaining} days remaining`;
        const subject = `Hirly Free Trial - ${triggerLabel}`;
        
        const { data: existingLog } = await supabase
          .from('superadmin_email_logs')
          .select('id')
          .eq('agency_id', user.workspace_id)
          .eq('subject', subject)
          .limit(1);

        if (!existingLog || existingLog.length === 0) {
          await supabase.from('superadmin_email_logs').insert([{
            agency_id: user.workspace_id,
            sender: 'billing@hirly.ai',
            recipient: user.email,
            subject: subject,
            body: `Hi ${user.name || 'there'},\n\nYour 7-day free trial of Hirly ${triggerLabel}. Upgrade to a paid plan today to ensure continuous access to all your candidate database, pipelines, and AI copilot.\n\nBest,\nThe Hirly Team`,
            status: 'Delivered'
          }]);
        }
      }
    }

    const subscriptionPlan = {
      slug: user.subscription_plan,
      status: user.subscription_status,
      billingCycle: user.billing_cycle,
      renewalDate: user.renewal_date,
      trialExpiry: user.trial_expiry,
      features: user.plan_features,
      limits: user.plan_limits,
      
      // New trial tracking fields
      isTrial: user.is_trial,
      subscriptionType: user.subscription_type,
      trialStartDate: user.trial_start_date,
      trialEndDate: user.trial_end_date,
      subscriptionStartDate: user.subscription_start_date,
      subscriptionEndDate: user.subscription_end_date,
      planId: user.plan_id
    };

    const subscriptionUsage = {
      companies: companies.length,
      jobs: jobs.length,
      candidates: candidates.length,
      teamMembers: teamMembers.length,
      aiRequests: aiRequestsCount || 0
    };

    return c.json({
      companies,
      jobs,
      candidates,
      tasks,
      emailTemplates,
      activityLogs,
      teamMembers,
      communicationLogs,
      emailConfig,
      customFieldDefinitions,
      workspaceRoles,
      workspace: workspaceData,
      lockedFeatures: workspaceData?.lockedFeatures || [],
      workspaceCreatedAt: workspaceData?.createdAt,
      rbacAuditLogs,
      subscriptionPlan,
      subscriptionUsage,
      companyContacts,
      companyDocuments,
      companyNotes,
      currentUser: {
        role: user.role,
        permissions: user.permissions,
        restrictedFeatures: user.restricted_features || [],
        isSuperAdmin: user.is_super_admin || false
      }
    });
  } catch (err: any) {
    console.error('Error in bootstrapping API:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// Profiles / Team Members Dedicated Workspace-Scoped Endpoints
workspaceRouter.get('/team_members', requirePermission('team.view'), async (c) => {
  const user = c.get('user') as any;
  try {
    const repo = new WorkspaceRepository('profiles', user);
    const profiles = await repo.getAll();

    // Fetch pending invitations
    const { data: invitations, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('workspace_id', user.workspace_id)
      .eq('status', 'pending');

    if (inviteError) throw inviteError;

    // Map invitations to profiles format
    const mappedInvitations = (invitations || []).map((invite: any) => ({
      id: `invite_${invite.id}`,
      name: invite.email.split('@')[0] || 'Pending Invite',
      email: invite.email,
      role: invite.role,
      status: 'Pending',
      lastLogin: 'Never',
      department: invite.department || 'HR Recruitment',
      message: `Invitation Token: ${invite.token}`
    }));

    return c.json([...profiles, ...mappedInvitations]);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.post('/team_members', requirePermission('team.add'), async (c) => {
  const user = c.get('user') as any;
  try {
    // Enforce seat limits
    const isTrialActive = user.is_trial && user.subscription_status === 'active' && user.trial_end_date && new Date(user.trial_end_date) >= new Date();
    if (!isTrialActive && user.plan_limits) {
      const rawLimit = user.plan_limits.max_team_members;
      if (rawLimit !== undefined && rawLimit !== 'unlimited') {
        const limitNum = parseInt(rawLimit);
        if (!isNaN(limitNum)) {
          // Count active profiles + pending invites
          const [profilesCount, invitesCount] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('workspace_id', user.workspace_id),
            supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('workspace_id', user.workspace_id).eq('status', 'pending')
          ]);
            
          const totalMembers = (profilesCount.count || 0) + (invitesCount.count || 0);
          if (totalMembers >= limitNum) {
            return c.json({ 
              error: `Limit Reached: Your current plan only allows up to ${limitNum} team members. Please upgrade your plan.`,
              limitReached: true,
              limitKey: 'max_team_members'
            }, 403);
          }
        }
      }
    }

    const body = await c.req.json();
    const snakeBody = keysToSnake(body);
    
    if (!snakeBody.email || !body.password) {
      return c.json({ error: 'Email and Password are required.' }, 400);
    }

    // Call Supabase Auth Admin API to create the user directly
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: snakeBody.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: snakeBody.name || snakeBody.email.split('@')[0]
      }
    });

    if (createError || !newUser?.user) {
      return c.json({ error: createError?.message || 'Failed to create user account.' }, 400);
    }

    // Create/upsert the profile in the profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        workspace_id: user.workspace_id,
        name: snakeBody.name || snakeBody.email.split('@')[0],
        email: snakeBody.email,
        role: snakeBody.role || 'Recruiter',
        department: snakeBody.department || 'HR Recruitment',
        status: 'Active'
      });

    if (profileError) {
      // Clean up the auth user if profile creation fails so we don't leave orphaned auth users
      await supabase.auth.admin.deleteUser(newUser.user.id);
      throw profileError;
    }

    // Log audit log
    await supabase.from('rbac_audit_logs').insert({
      workspace_id: user.workspace_id,
      target_user_id: newUser.user.id,
      target_user_name: snakeBody.email,
      action: 'Member Created (Direct)',
      previous_role: null,
      new_role: snakeBody.role || 'Recruiter',
      changed_by_id: user.id,
      changed_by_name: user.name || user.email
    });

    const mappedMember = {
      id: newUser.user.id,
      name: snakeBody.name || snakeBody.email.split('@')[0],
      email: snakeBody.email,
      role: snakeBody.role || 'Recruiter',
      status: 'Active',
      lastLogin: 'Never',
      department: snakeBody.department || 'HR Recruitment'
    };

    return c.json(mappedMember);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.put('/team_members/:id', requirePermission('team.edit_role'), async (c) => {
  const user = c.get('user') as any;
  const id = c.req.param('id');
  try {
    const body = await c.req.json();
    const { data: originalProfile } = await supabase
      .from('profiles')
      .select('role, name, status, custom_permissions, restricted_features')
      .eq('id', id)
      .single();

    if (body.password) {
      const { error: pwdError } = await supabase.auth.admin.updateUserById(id, {
        password: body.password
      });
      if (pwdError) throw pwdError;
    }

    const repo = new WorkspaceRepository('profiles', user);
    const { password, ...profileBody } = body;
    const data = await repo.update(id, profileBody);

    if (originalProfile) {
      if (body.password) {
        await supabase.from('rbac_audit_logs').insert({
          workspace_id: user.workspace_id,
          target_user_id: id,
          target_user_name: data.name,
          action: 'Password Changed',
          previous_role: originalProfile.role,
          new_role: body.role || originalProfile.role,
          changed_by_id: user.id,
          changed_by_name: user.name || user.email
        });
      }
      if (body.customPermissions) {
        const originalPerms = originalProfile.custom_permissions || [];
        const newPerms = body.customPermissions || [];
        const permsChanged = JSON.stringify([...originalPerms].sort()) !== JSON.stringify([...newPerms].sort());
        if (permsChanged) {
          await supabase.from('rbac_audit_logs').insert({
            workspace_id: user.workspace_id,
            target_user_id: id,
            target_user_name: data.name,
            action: 'Permissions Overridden',
            previous_role: originalProfile.role,
            new_role: body.role || originalProfile.role,
            changed_by_id: user.id,
            changed_by_name: user.name || user.email
          });
        }
      }
      if (body.restrictedFeatures) {
        const originalRest = originalProfile.restricted_features || [];
        const newRest = body.restrictedFeatures || [];
        const restChanged = JSON.stringify([...originalRest].sort()) !== JSON.stringify([...newRest].sort());
        if (restChanged) {
          await supabase.from('rbac_audit_logs').insert({
            workspace_id: user.workspace_id,
            target_user_id: id,
            target_user_name: data.name,
            action: 'Restrictions Updated',
            previous_role: originalProfile.role,
            new_role: body.role || originalProfile.role,
            changed_by_id: user.id,
            changed_by_name: user.name || user.email
          });
        }
      }
      if (originalProfile.role !== body.role && body.role) {
        await supabase.from('rbac_audit_logs').insert({
          workspace_id: user.workspace_id,
          target_user_id: id,
          target_user_name: data.name,
          action: 'Role Changed',
          previous_role: originalProfile.role,
          new_role: body.role,
          changed_by_id: user.id,
          changed_by_name: user.name || user.email
        });
      }
      if (originalProfile.status !== body.status && body.status) {
        await supabase.from('rbac_audit_logs').insert({
          workspace_id: user.workspace_id,
          target_user_id: id,
          target_user_name: data.name,
          action: body.status === 'Disabled' ? 'User Suspended' : 'User Activated',
          previous_role: originalProfile.role,
          new_role: body.role || originalProfile.role,
          changed_by_id: user.id,
          changed_by_name: user.name || user.email
        });
      }
    }

    return c.json(data);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.delete('/team_members/:id', requirePermission('team.remove'), async (c) => {
  const user = c.get('user') as any;
  const id = c.req.param('id');
  try {
    if (id.startsWith('invite_')) {
      const inviteId = id.replace('invite_', '');
      const { data: targetInvite, error: inviteGetError } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', inviteId)
        .eq('workspace_id', user.workspace_id)
        .single();

      if (inviteGetError || !targetInvite) {
        return c.json({ error: 'Invitation not found or access denied.' }, 404);
      }

      const { error: inviteDeleteError } = await supabase
        .from('invitations')
        .delete()
        .eq('id', inviteId);

      if (inviteDeleteError) throw inviteDeleteError;

      return c.json({ success: true });
    }

    const repo = new WorkspaceRepository('profiles', user);
    
    // Verify target profile is in user's workspace and check its role
    const targetProfiles = await repo.getCustom('role, name', { id });
    if (targetProfiles.length === 0) {
      return c.json({ error: 'Team member not found or access denied.' }, 404);
    }
    if (targetProfiles[0].role === 'Owner') {
      return c.json({ error: 'Forbidden: Cannot delete the workspace Owner.' }, 403);
    }

    const result = await repo.delete(id);

    // Log audit log
    await supabase.from('rbac_audit_logs').insert({
      workspace_id: user.workspace_id,
      target_user_id: id,
      target_user_name: targetProfiles[0].name,
      action: 'Member Removed',
      previous_role: targetProfiles[0].role,
      new_role: null,
      changed_by_id: user.id,
      changed_by_name: user.name || user.email
    });

    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.get('/email-config', requirePermission('settings.email'), async (c) => {
  const user = c.get('user') as any;
  try {
    const repo = new WorkspaceRepository('email_configs', user);
    const data = await repo.getAll();
    if (data.length === 0) {
      return c.json({ provider: 'Gmail', isConnected: false });
    }
    return c.json(data[0]);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.post('/email-config', requirePermission('settings.email'), async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const snakeBody = keysToSnake(body);
    
    snakeBody.workspace_id = user.workspace_id;
    snakeBody.updated_by = user.id;
    
    // Always force workspace_id as primary key (id) for safety and isolation
    snakeBody.id = user.workspace_id;
    
    const { data, error } = await supabase.from('email_configs').upsert([snakeBody]).select();
    if (error) throw error;
    
    return c.json(keysToCamel(data[0]));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.post('/email-config/test', requirePermission('settings.email'), async (c) => {
  const body = await c.req.json();
  const logs: string[] = [];
  logs.push('Initializing SMTP socket connection...');
  logs.push(`Connecting to host ${body.smtpHost}:${body.port}...`);
  logs.push(`Negotiating secure ${body.encryption} handshake...`);

  try {
    const transporter = nodemailer.createTransport({
      host: body.smtpHost,
      port: parseInt(body.port),
      secure: body.encryption === 'SSL',
      auth: {
        user: body.username,
        pass: body.password,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    logs.push('Transporter created. Verifying connection...');
    await transporter.verify();
    logs.push('SMTP connection established and authenticated successfully.');
    
    if (body.testEmailTarget) {
      logs.push(`Dispatching test verification handshake packet to ${body.testEmailTarget}...`);
      await transporter.sendMail({
        from: `"${body.username.split('@')[0]}" <${body.username}>`,
        to: body.testEmailTarget,
        subject: '[Hirly] Outbox SMTP Verification Successful',
        text: 'Hello!\n\nThis is a test email confirming that your outbound SMTP mail pipeline is fully verified and connected to Hirly. You can now perform direct recruiting transmissions from your account.',
      });
      logs.push('Verification handshake delivered. SMTP response code: 250 (OK).');
    }

    return c.json({ success: true, logs });
  } catch (err: any) {
    console.error('SMTP verification failed:', err);
    logs.push(`ERROR: SMTP connection / authentication failed. Code/Message: ${err.message}`);
    return c.json({ success: false, error: err.message, logs });
  }
});

workspaceRouter.post('/send-email', requirePermission('candidates.view'), async (c) => {
  const user = c.get('user') as any;
  const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || undefined;
  try {
    const body = await c.req.json();
    const { to, subject, body: emailBody } = body;

    if (!to || !subject || !emailBody) {
      return c.json({ success: false, error: 'Missing required fields: to, subject, body' }, 400);
    }

    // Try OAuth integration first
    const oauthIntegration = await EmailIntegrationDB.getActiveForWorkspace(user.workspace_id);
    if (oauthIntegration) {
      await sendEmailViaOAuth(oauthIntegration, to, subject, emailBody, ipAddress);
      console.log(`[Email Sent via OAuth] To: ${to} | Provider: ${oauthIntegration.provider} | Workspace: ${user.workspace_id}`);
      return c.json({ success: true, message: `Email delivered to ${to} via ${oauthIntegration.provider}`, method: 'oauth' });
    }

    // Fallback: SMTP config
    const { data: configs, error: configErr } = await supabase
      .from('email_configs')
      .select('*')
      .eq('workspace_id', user.workspace_id);

    if (configErr) throw configErr;

    const config = configs && configs.length > 0 ? configs[0] : null;
    if (!config || !config.is_connected || !config.smtp_host) {
      return c.json({
        success: false,
        error: 'No email integration found. Go to Settings → Email Integration to connect Gmail or Outlook, or configure SMTP under Email Setup Wizard.'
      }, 400);
    }

    // Build nodemailer SMTP transport
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: parseInt(config.port || '587'),
      secure: config.encryption === 'SSL',
      auth: { user: config.username, pass: config.password },
      tls: { rejectUnauthorized: false }
    });

    const senderName = config.username.split('@')[0];
    const htmlBody = emailBody
      .replace(/\n/g, '<br/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    await transporter.sendMail({
      from: `"${senderName}" <${config.username}>`,
      to,
      subject,
      text: emailBody,
      html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;">${htmlBody}</div>`
    });

    console.log(`[Email Sent via SMTP] To: ${to} | Subject: ${subject} | Workspace: ${user.workspace_id}`);
    return c.json({ success: true, message: `Email delivered to ${to}`, method: 'smtp' });
  } catch (err: any) {
    console.error('[Send Email Error]', err.message);
    return c.json({ success: false, error: err.message }, 500);
  }
});

// JOB CANDIDATES (Pipeline) Routes
workspaceRouter.get('/job-candidates', requirePermission('pipeline.view'), async (c) => {
  const user = c.get('user') as any;
  try {
    const repo = new WorkspaceRepository('job_candidates', user);
    const data = await repo.getCustom('*, candidate:candidates(*)');
    return c.json(data);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.get('/job-candidates/:jobId', requirePermission('pipeline.view'), async (c) => {
  const user = c.get('user') as any;
  const jobId = c.req.param('jobId');
  try {
    const repo = new WorkspaceRepository('job_candidates', user);
    const data = await repo.getCustom('*, candidate:candidates(*)', { job_id: jobId });
    return c.json(data);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.post('/job-candidates', requirePermission('pipeline.move_candidate'), async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    
    // Check if recruiter has access to the job
    const userRole = (user.role || '').toLowerCase();
    const strategy = user.recruiter_assignment_strategy || 'global';
    if (userRole !== 'owner' && userRole !== 'admin' && strategy !== 'global' && !user.is_super_admin) {
      const repo = new WorkspaceRepository('jobs', user);
      const jobs = await repo.getAll();
      const accessibleJobIds = jobs.map((j: any) => j.id);
      if (!accessibleJobIds.includes(body.jobId)) {
        return c.json({ error: 'Forbidden: You do not have assignment access to this job.' }, 403);
      }
    }

    const row = {
      jobId: body.jobId,
      candidateId: body.candidateId,
      stage: body.stage || 'Applied',
      addedDate: new Date().toISOString().split('T')[0],
      userId: user.id
    };

    const snakeRow = keysToSnake(row);
    snakeRow.workspace_id = user.workspace_id;
    snakeRow.created_by = user.id;
    snakeRow.updated_by = user.id;

    const { data, error } = await supabase
      .from('job_candidates')
      .upsert([snakeRow], { onConflict: 'job_id,candidate_id' })
      .select();

    if (error) throw error;
    return c.json(keysToCamel(data[0]));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.patch('/job-candidates/:id', requirePermission('pipeline.move_candidate'), async (c) => {
  const user = c.get('user') as any;
  const id = c.req.param('id');
  try {
    const body = await c.req.json();
    const repo = new WorkspaceRepository('job_candidates', user);
    const data = await repo.update(id, body);
    return c.json(data);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.delete('/job-candidates/:id', requirePermission('pipeline.move_candidate'), async (c) => {
  const user = c.get('user') as any;
  const id = c.req.param('id');
  try {
    const repo = new WorkspaceRepository('job_candidates', user);
    const result = await repo.delete(id);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// RBAC / Permissions API Endpoints
workspaceRouter.get('/workspace-roles', requirePermission('settings.view'), async (c) => {
  const user = c.get('user') as any;
  try {
    const { data, error } = await supabase
      .from('workspace_roles')
      .select('*')
      .eq('workspace_id', user.workspace_id);
    
    if (error) throw error;
    return c.json(keysToCamel(data || []));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.post('/workspace-roles', requirePermission('team.edit_role'), async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const snakeBody = keysToSnake(body);
    
    const { data, error } = await supabase
      .from('workspace_roles')
      .insert({
        workspace_id: user.workspace_id,
        name: snakeBody.name,
        permissions: snakeBody.permissions || [],
        is_custom: true
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Log audit log
    await supabase.from('rbac_audit_logs').insert({
      workspace_id: user.workspace_id,
      target_user_id: user.id,
      target_user_name: `Role: ${body.name}`,
      action: 'Role Created',
      previous_role: null,
      new_role: body.name,
      changed_by_id: user.id,
      changed_by_name: user.name || user.email
    });

    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.put('/workspace-roles/:id', requirePermission('team.edit_role'), async (c) => {
  const user = c.get('user') as any;
  const id = c.req.param('id');
  try {
    const body = await c.req.json();
    const snakeBody = keysToSnake(body);

    const { data: originalRole } = await supabase
      .from('workspace_roles')
      .select('name, permissions')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('workspace_roles')
      .update({
        permissions: snakeBody.permissions,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    // Log audit log
    await supabase.from('rbac_audit_logs').insert({
      workspace_id: user.workspace_id,
      target_user_id: user.id,
      target_user_name: `Role: ${originalRole?.name || 'Unknown'}`,
      action: 'Role Permissions Modified',
      previous_role: originalRole ? JSON.stringify(originalRole.permissions) : null,
      new_role: JSON.stringify(body.permissions),
      changed_by_id: user.id,
      changed_by_name: user.name || user.email
    });

    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.delete('/workspace-roles/:id', requirePermission('team.edit_role'), async (c) => {
  const user = c.get('user') as any;
  const id = c.req.param('id');
  try {
    const { data: originalRole } = await supabase
      .from('workspace_roles')
      .select('name')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('workspace_roles')
      .delete()
      .eq('id', id)
      .eq('is_custom', true);
    
    if (error) throw error;

    // Log audit log
    await supabase.from('rbac_audit_logs').insert({
      workspace_id: user.workspace_id,
      target_user_id: user.id,
      target_user_name: `Role: ${originalRole?.name || 'Unknown'}`,
      action: 'Role Deleted',
      previous_role: originalRole?.name,
      new_role: null,
      changed_by_id: user.id,
      changed_by_name: user.name || user.email
    });

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.post('/workspace/locked-features', requirePermission('settings.workspace'), async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const { lockedFeatures } = body;

    const { data: originalWs } = await supabase
      .from('workspaces')
      .select('locked_features')
      .eq('id', user.workspace_id)
      .single();

    const { data, error } = await supabase
      .from('workspaces')
      .update({
        locked_features: lockedFeatures,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.workspace_id)
      .select()
      .single();
    
    if (error) throw error;

    // Log audit log
    await supabase.from('rbac_audit_logs').insert({
      workspace_id: user.workspace_id,
      target_user_id: user.id,
      target_user_name: 'Workspace Feature Locks',
      action: 'Feature Toggles Updated',
      previous_role: originalWs ? JSON.stringify(originalWs.locked_features) : null,
      new_role: JSON.stringify(lockedFeatures),
      changed_by_id: user.id,
      changed_by_name: user.name || user.email
    });

    return c.json({ success: true, lockedFeatures: data.locked_features });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.get('/rbac-audit-logs', requirePermission('team.view'), async (c) => {
  const user = c.get('user') as any;
  try {
    const { data, error } = await supabase
      .from('rbac_audit_logs')
      .select('*')
      .eq('workspace_id', user.workspace_id)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return c.json(keysToCamel(data || []));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.post('/workspace/upgrade', async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const { planSlug } = body;

    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', planSlug)
      .single();

    if (planError || !plan) {
      return c.json({ error: 'Invalid subscription plan selected.' }, 400);
    }

    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + 1);

    const { data, error } = await supabase
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

    if (error) throw error;

    return c.json({ success: true, workspace: keysToCamel(data) });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.post('/workspaces', async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const { name, slug } = body;

    const workspaceSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const { data: settings } = await supabase
      .from('superadmin_settings')
      .select('trial_enabled, trial_duration_days')
      .eq('id', 'global')
      .single();

    const trialEnabled = settings?.trial_enabled !== false;
    const trialDays = settings?.trial_duration_days || 7;
    const startTrial = body.isTrial !== false && trialEnabled;

    const renewalDate = new Date();
    if (startTrial) {
      renewalDate.setDate(renewalDate.getDate() + trialDays);
    } else {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    // Insert workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert([{
        name,
        slug: workspaceSlug,
        owner_id: user.id,
        subscription_plan: startTrial ? 'growth' : 'starter',
        billing_cycle: 'monthly',
        renewal_date: renewalDate.toISOString(),
        subscription_status: 'active',
        is_trial: startTrial,
        subscription_type: startTrial ? 'trial' : 'paid',
        trial_start_date: startTrial ? new Date().toISOString() : null,
        trial_end_date: startTrial ? renewalDate.toISOString() : null,
        plan_id: startTrial ? 'fa26210e-a9a9-40c2-a4d5-d4eaf4c246fa' : null,
        subscription_start_date: startTrial ? null : new Date().toISOString()
      }])
      .select()
      .single();

    if (wsError) throw wsError;

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        workspace_id: workspace.id,
        role: 'Owner',
        status: 'Active'
      })
      .eq('id', user.id);

    if (profileError) throw profileError;

    return c.json({
      success: true,
      workspace: keysToCamel(workspace)
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.put('/workspaces/:id', requirePermission('settings.workspace'), async (c) => {
  const user = c.get('user') as any;
  const id = c.req.param('id');

  if (user.workspace_id !== id) {
    return c.json({ error: 'Forbidden: Access denied to other workspaces' }, 403);
  }

  try {
    const body = await c.req.json();
    const snakeBody = keysToSnake(body);

    const updatePayload: any = {};
    if ('name' in snakeBody) updatePayload.name = snakeBody.name;
    if ('recruiter_assignment_strategy' in snakeBody) updatePayload.recruiter_assignment_strategy = snakeBody.recruiter_assignment_strategy;
    if ('show_workload_limit_to_recruiters' in snakeBody) updatePayload.show_workload_limit_to_recruiters = snakeBody.show_workload_limit_to_recruiters;
    if ('logo' in snakeBody) updatePayload.logo = snakeBody.logo;

    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('workspaces')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.get('/recruiters/metrics', requirePermission('team.view'), async (c) => {
  const user = c.get('user') as any;
  try {
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .eq('workspace_id', user.workspace_id);
    if (pError) throw pError;

    const [companyAssigns, jobAssigns, tasksPending, placementsData, interviewsData] = await Promise.all([
      supabase.from('company_assignments').select('company_id, user_id').eq('workspace_id', user.workspace_id),
      supabase.from('job_assignments').select('job_id, user_id').eq('workspace_id', user.workspace_id),
      supabase.from('tasks').select('id, assigned_to').eq('workspace_id', user.workspace_id).eq('status', 'Pending'),
      supabase.from('job_candidates').select('total_agency_fee, user_id, stage').eq('workspace_id', user.workspace_id).eq('stage', 'Joined'),
      supabase.from('interviews').select('id, user_id, status').eq('workspace_id', user.workspace_id)
    ]);

    const metrics = profiles.map((profile: any) => {
      const pCompanyAssigns = (companyAssigns.data || []).filter((a: any) => a.user_id === profile.id);
      const pJobAssigns = (jobAssigns.data || []).filter((a: any) => a.user_id === profile.id);
      const pTasksPending = (tasksPending.data || []).filter((t: any) => t.assigned_to === profile.id);
      const pPlacements = (placementsData.data || []).filter((jc: any) => jc.user_id === profile.id);
      const pInterviews = (interviewsData.data || []).filter((i: any) => i.user_id === profile.id);

      const totalAgencyFee = pPlacements.reduce((sum: number, jc: any) => sum + (jc.total_agency_fee || 0), 0);
      const incentiveRate = profile.incentive_rate || 10.0;
      const incentiveType = profile.incentive_type || 'Percentage';
      const incentivesEarned = incentiveType === 'Fixed'
        ? pPlacements.length * incentiveRate
        : totalAgencyFee * (incentiveRate / 100);

      return {
        recruiterId: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        department: profile.department,
        status: profile.status,
        assignedCompaniesCount: pCompanyAssigns.length,
        assignedJobsCount: pJobAssigns.length,
        pendingTasksCount: pTasksPending.length,
        interviewsCount: pInterviews.length,
        placementsCount: pPlacements.length,
        totalAgencyFee,
        incentiveRate,
        incentiveType,
        incentivesEarned
      };
    });

    return c.json(metrics);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.get('/public/invitations/:token', async (c) => {
  const token = c.req.param('token');
  try {
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return c.json({ error: 'Invalid invitation link' }, 400);
    }

    if (invitation.status !== 'pending') {
      return c.json({ error: 'Invitation has already been accepted' }, 400);
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return c.json({ error: 'Invitation link has expired' }, 400);
    }

    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', invitation.workspace_id)
      .single();

    if (wsError) throw wsError;

    return c.json({
      isValid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        department: invitation.department,
        workspaceName: workspace.name
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.post('/invitations/accept', async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const { token } = body;

    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return c.json({ error: 'Invalid invitation link' }, 400);
    }

    if (invitation.status !== 'pending') {
      return c.json({ error: 'Invitation has already been accepted' }, 400);
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return c.json({ error: 'Invitation link has expired' }, 400);
    }

    // Enforce email match
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return c.json({ error: `This invitation is for ${invitation.email}, but you are logged in as ${user.email}.` }, 400);
    }

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        workspace_id: invitation.workspace_id,
        role: invitation.role,
        department: invitation.department,
        status: 'Active'
      })
      .eq('id', user.id);

    if (profileError) throw profileError;

    // Update invitation status
    await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    return c.json({
      success: true,
      workspaceId: invitation.workspace_id
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.get('/support', async (c) => {
  const user = c.get('user') as any;
  try {
    const { data, error } = await supabase
      .from('superadmin_tickets')
      .select('*')
      .eq('agency_id', user.workspace_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return c.json(keysToCamel(data || []));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

workspaceRouter.post('/support', async (c) => {
  const user = c.get('user') as any;
  try {
    const body = await c.req.json();
    const { subject, description, priority, attachment } = body;

    const { data, error } = await supabase
      .from('superadmin_tickets')
      .insert([{
        agency_id: user.workspace_id,
        subject,
        description,
        priority: priority || 'Medium',
        status: 'Open',
        attachment
      }])
      .select()
      .single();

    if (error) throw error;
    return c.json(keysToCamel(data));
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

