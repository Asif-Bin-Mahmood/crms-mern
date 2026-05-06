import { Bill } from '../models/Bill.js';
import { Requires } from '../models/Requires.js';
import { DeliveryType, NotificationTarget, PaymentStatus } from '../utils/enums.js';
import { notifyRepairEvent } from './notificationService.js';

export async function ensureBillForCompletedRepair(repair, laborCharge = 0, tax = 0) {
  const existing = await Bill.findOne({ repairRequestId: repair._id });
  const partsCost = await calculatePartsCost(repair._id);
  if (existing) {
    existing.partsCost = partsCost;
    existing.laborCharge = Number.isFinite(Number(laborCharge))
      ? Number(laborCharge)
      : existing.laborCharge;
    existing.tax = Number.isFinite(Number(tax)) ? Number(tax) : existing.tax;
    await existing.save();
    return existing;
  }

  const bill = await Bill.create({
    repairRequestId: repair._id,
    customerId: repair.customerId,
    laborCharge,
    tax,
    partsCost,
    paymentStatus: PaymentStatus.PENDING,
    dateGenerated: new Date(),
  });

  await notifyRepairEvent(
    repair._id,
    `Bill ${bill._id} generated. Total: ${bill.getTotalAmount()}`,
    NotificationTarget.CUSTOMER,
    DeliveryType.EMAIL
  );
  await notifyRepairEvent(
    repair._id,
    `Bill ready for repair ${repair._id}`,
    NotificationTarget.TECHNICIAN,
    DeliveryType.PUSH
  );

  return bill;
}

export async function refreshBillPartsCost(repairRequestId) {
  const bill = await Bill.findOne({ repairRequestId });
  if (!bill) return null;
  bill.partsCost = await calculatePartsCost(repairRequestId);
  await bill.save();
  return bill;
}

async function calculatePartsCost(repairRequestId) {
  const reqs = await Requires.find({ repairRequestId });
  return reqs.reduce((sum, r) => sum + Number(r.totalCostUsed || 0), 0);
}
