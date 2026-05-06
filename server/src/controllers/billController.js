import { Bill } from '../models/Bill.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';
import { PaymentStatus } from '../utils/enums.js';
import { ok, fail } from '../utils/response.js';
import { UserRole } from '../utils/enums.js';
import { notifyRepairEvent } from '../services/notificationService.js';
import { DeliveryType, NotificationTarget } from '../utils/enums.js';

export async function listBills(req, res) {
  let q = {};
  if (req.user.role === UserRole.CUSTOMER) {
    q.customerId = req.user.id;
  }
  const bills = await Bill.find(q).populate('repairRequestId').sort({ createdAt: -1 });
  return ok(res, { bills });
}

export async function getBill(req, res) {
  const bill = await Bill.findById(req.params.id)
    .populate('repairRequestId')
    .populate('customerId', 'name email');
  if (!bill) return fail(res, 'Not found', 404);
  if (req.user.role === UserRole.CUSTOMER && bill.customerId._id.toString() !== req.user.id) {
    return fail(res, 'Forbidden', 403);
  }
  const obj = bill.toObject();
  obj.totalAmount = bill.getTotalAmount();

  // Attach latest payment transaction (for payment method / receipt info)
  const tx = await PaymentTransaction.findOne({ billId: bill._id }).sort({ createdAt: -1 });
  obj.paymentTransaction = tx || null;

  return ok(res, { bill: obj });
}

export async function updatePaymentStatus(req, res) {
  const bill = await Bill.findById(req.params.id);
  if (!bill) return fail(res, 'Not found', 404);
  if (req.user.role === UserRole.CUSTOMER && bill.customerId.toString() !== req.user.id) {
    return fail(res, 'Forbidden', 403);
  }
  const { paymentStatus } = req.body;
  if (!paymentStatus || !Object.values(PaymentStatus).includes(paymentStatus)) {
    return fail(res, 'Valid paymentStatus required', 400);
  }

  if (!canTransitionPaymentStatus(bill.paymentStatus, paymentStatus)) {
    return fail(res, `Invalid payment status transition ${bill.paymentStatus} -> ${paymentStatus}`, 400);
  }

  if (bill.paymentStatus === paymentStatus) {
    return ok(res, { bill });
  }

  const previousStatus = bill.paymentStatus;
  bill.paymentStatus = paymentStatus;
  await bill.save();
  await notifyRepairEvent(
    bill.repairRequestId,
    `Bill ${bill._id} payment status updated: ${previousStatus} -> ${paymentStatus}`,
    NotificationTarget.CUSTOMER,
    DeliveryType.EMAIL
  );
  return ok(res, { bill });
}

function canTransitionPaymentStatus(from, to) {
  const allowed = {
    [PaymentStatus.PENDING]: [PaymentStatus.PAID, PaymentStatus.FAILED],
    [PaymentStatus.FAILED]: [PaymentStatus.PAID],
    [PaymentStatus.PAID]: [PaymentStatus.REFUNDED],
    [PaymentStatus.REFUNDED]: [],
  };
  if (from === to) return true;
  return allowed[from]?.includes(to) ?? false;
}
