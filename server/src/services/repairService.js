import { RepairStatus, DeliveryJobStatus } from '../utils/enums.js';
import { ensureBillForCompletedRepair } from './billingService.js';
import { notifyRepairEvent } from './notificationService.js';
import { NotificationTarget, DeliveryType } from '../utils/enums.js';
import DeliveryJob from '../models/DeliveryJob.js';

const allowed = {
  [RepairStatus.PENDING]:     [RepairStatus.IN_PROGRESS, RepairStatus.CANCELLED],
  [RepairStatus.IN_PROGRESS]: [RepairStatus.COMPLETED, RepairStatus.CANCELLED],
  [RepairStatus.COMPLETED]:   [],
  [RepairStatus.CANCELLED]:   [],
};

export function canTransition(from, to) {
  return allowed[from]?.includes(to) ?? false;
}

export async function afterStatusChange(repair, previousStatus, newStatus, options = {}) {
  await notifyRepairEvent(
    repair._id,
    `Repair ${repair._id} status: ${previousStatus} → ${newStatus}`,
    NotificationTarget.CUSTOMER,
    DeliveryType.EMAIL
  );

  if (newStatus === RepairStatus.COMPLETED) {
    // Bill বানাও
    await ensureBillForCompletedRepair(repair, options.laborCharge ?? 0, options.tax ?? 0);

    // Delivery Job কে PENDING_RETURN এ set করো — DM দের notify
    try {
      const job = await DeliveryJob.findOne({ repairRequestId: repair._id });
      if (job) {
        job.deliveryManId = null;
        job.status = DeliveryJobStatus.PENDING_RETURN;
        job.statusHistory.push({
          status: DeliveryJobStatus.PENDING_RETURN,
          note:   'Repair completed — return pickup requested',
        });
        await job.save();
        console.log(`[Delivery] Job ${job._id} → PENDING_RETURN`);
      }
    } catch (err) {
      console.error('[Delivery] Failed to advance to PENDING_RETURN:', err.message);
    }
  }
}