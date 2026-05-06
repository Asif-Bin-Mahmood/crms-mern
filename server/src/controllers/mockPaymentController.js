import { Bill } from '../models/Bill.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';
import { PaymentStatus, NotificationTarget, DeliveryType } from '../utils/enums.js';
import { env } from '../config/env.js';
import { ok, fail } from '../utils/response.js';
import { notifyRepairEvent } from '../services/notificationService.js';
import { UserRole } from '../utils/enums.js';

/**
 * POST /api/payment/demo/pay
 * Mock payment simulator — only active when PAYMENT_MODE=demo.
 * Never usable in production (NODE_ENV=production guard).
 */
export async function demoPayment(req, res) {
  // ── Security guard ──────────────────────────────────────────────────────────
  if (env.nodeEnv === 'production') {
    return fail(res, 'Demo payment mode is disabled in production.', 403);
  }
  if (env.paymentMode !== 'demo') {
    return fail(res, 'Demo payment endpoint is not active. Set PAYMENT_MODE=demo.', 403);
  }

  const { billId, paymentMethod, cardNumber, mobileNumber, simulateFailure } = req.body;

  if (!billId) return fail(res, 'billId is required', 400);
  if (!paymentMethod) return fail(res, 'paymentMethod is required', 400);

  const bill = await Bill.findById(billId).populate('customerId').populate('repairRequestId');
  if (!bill) return fail(res, 'Bill not found', 404);

  // Demo mode: no strict ownership check — any authenticated user can test payment
  // (production endpoint has its own real auth check)

  // ── Simulate failure / cancellation ─────────────────────────────────────────
  if (simulateFailure === 'CANCEL') {
    const tx = await PaymentTransaction.create({
      billId: bill._id,
      customerId: bill.customerId._id,
      transactionId: `DEMO-CANCEL-${Date.now()}`,
      amount: bill.getTotalAmount(),
      paymentMethod: paymentMethod || 'DEMO',
      status: 'CANCELLED',
      isDemo: true,
    });
    return ok(res, { status: 'CANCELLED', transactionId: tx.transactionId });
  }

  if (simulateFailure === 'FAIL') {
    const tx = await PaymentTransaction.create({
      billId: bill._id,
      customerId: bill.customerId._id,
      transactionId: `DEMO-FAIL-${Date.now()}`,
      amount: bill.getTotalAmount(),
      paymentMethod: paymentMethod || 'DEMO',
      status: 'FAILED',
      isDemo: true,
    });
    bill.paymentStatus = PaymentStatus.FAILED;
    await bill.save();
    return ok(res, { status: 'FAILED', transactionId: tx.transactionId });
  }

  // ── Successful demo payment ──────────────────────────────────────────────────
  const transactionId = `DEMO-${Date.now().toString(36).toUpperCase()}-${bill._id.toString().slice(-4).toUpperCase()}`;
  const amount = bill.getTotalAmount();

  // Mask sensitive input — never store real card/OTP data
  const maskedCard = cardNumber
    ? `****-****-****-${String(cardNumber).replace(/\s/g, '').slice(-4)}`
    : undefined;
  const maskedMobile = mobileNumber
    ? `${String(mobileNumber).slice(0, 3)}*****${String(mobileNumber).slice(-2)}`
    : undefined;

  const tx = await PaymentTransaction.create({
    billId: bill._id,
    customerId: bill.customerId._id,
    transactionId,
    amount,
    paymentMethod,
    status: 'SUCCESS',
    isDemo: true,
    metadata: {
      maskedCard,
      mobileNumber: maskedMobile,
      bankName: mobileNumber ? 'Demo Mobile Bank' : 'Demo Visa/MC',
    },
    paidAt: new Date(),
  });

  // Update bill to PAID
  bill.paymentStatus = PaymentStatus.PAID;
  await bill.save();

  // Notify (non-fatal)
  try {
    const repairId = bill.repairRequestId?._id ?? bill.repairRequestId;
    if (repairId) {
      await notifyRepairEvent(
        repairId,
        `[DEMO] Payment of ৳${amount} received. TxID: ${transactionId}`,
        NotificationTarget.CUSTOMER,
        DeliveryType.EMAIL
      );
    }
  } catch (e) {
    console.warn('[demoPayment] Notification error (non-fatal):', e.message);
  }

  return ok(res, {
    status: 'SUCCESS',
    transactionId: tx.transactionId,
    amount: tx.amount,
    paidAt: tx.paidAt,
    paymentMethod: tx.paymentMethod,
    maskedCard: tx.metadata?.maskedCard,
    mobileNumber: tx.metadata?.mobileNumber,
    billId: bill._id,
    customerId: bill.customerId?._id ?? bill.customerId,
    customerName: bill.customerId?.name || 'Demo Customer',
    customerEmail: bill.customerId?.email || 'demo@crms.test',
    invoiceNumber: `INV-${bill._id.toString().slice(-8).toUpperCase()}`,
    repairDescription: bill.repairRequestId?.issueDescription || 'Repair Service',
    laborCharge: bill.laborCharge,
    partsCost: bill.partsCost,
    tax: bill.tax,
    isDemo: true,
  });
}

/**
 * GET /api/payment/demo/status
 * Returns current payment mode — safe for the frontend to query.
 */
export async function demoStatus(req, res) {
  return ok(res, {
    paymentMode: env.paymentMode,
    isDemo: env.paymentMode === 'demo' && env.nodeEnv !== 'production',
  });
}
