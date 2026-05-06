import { Notification } from '../models/Notification.js';
import { RepairRequest } from '../models/RepairRequest.js';
import { UserRole } from '../utils/enums.js';
import { ok, fail } from '../utils/response.js';

export async function listNotifications(req, res) {
  let q = {};
  if (req.query.repairRequestId) q.repairRequestId = req.query.repairRequestId;

  if (req.user.role === UserRole.CUSTOMER) {
    const repairs = await RepairRequest.find({ customerId: req.user.id }).select('_id');
    const ids = repairs.map((r) => r._id);
    q.repairRequestId = { $in: ids };
  }

  const notifications = await Notification.find(q).sort({ timeStamp: -1 }).limit(100);
  return ok(res, { notifications });
}

export async function getNotification(req, res) {
  const n = await Notification.findById(req.params.id);
  if (!n) return fail(res, 'Not found', 404);
  if (req.user.role === UserRole.CUSTOMER) {
    const repair = await RepairRequest.findById(n.repairRequestId).select('customerId');
    if (!repair || repair.customerId.toString() !== req.user.id) {
      return fail(res, 'Forbidden', 403);
    }
  }
  return ok(res, { notification: n });
}
