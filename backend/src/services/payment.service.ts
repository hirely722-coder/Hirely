import crypto from 'crypto';
const Razorpay = (require as any)('razorpay');

export function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys are not configured.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error('Razorpay configuration error.');
  }

  const hmac = crypto.createHmac('sha256', keySecret);
  hmac.update(razorpayOrderId + '|' + razorpayPaymentId);
  const generatedSignature = hmac.digest('hex');

  return generatedSignature === razorpaySignature;
}
