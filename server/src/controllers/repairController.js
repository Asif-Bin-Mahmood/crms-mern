import { RepairRequest } from '../models/RepairRequest.js';
import { Device } from '../models/Device.js';
import { AssignedTo } from '../models/AssignedTo.js';
import { Requires } from '../models/Requires.js';
import { UserRole, DeliveryJobStatus, RepairStatus } from '../utils/enums.js';
import { ok, fail } from '../utils/response.js';
import { canTransition, afterStatusChange } from '../services/repairService.js';

export async function listRepairs(req, res) {
  try {
    let q = {};
    if (req.user.role === UserRole.CUSTOMER) {
      q.customerId = req.user.id;
    } else if (req.query.customerId) {
      q.customerId = req.query.customerId;
    }
    if (req.query.status) q.currentStatus = req.query.status;

    if ([UserRole.LEAD_TECHNICIAN, UserRole.JUNIOR_TECHNICIAN].includes(req.user.role)) {
      const links = await AssignedTo.find({ technicianId: req.user.id }).select('repairRequestId');
      const ids = links.map((l) => l.repairRequestId);
      // If technician has no assignments, return empty — $in:[] would return everything
      if (ids.length === 0) return ok(res, { repairs: [] });
      q._id = { $in: ids };
    }

    const repairs = await RepairRequest.find(q)
      .populate('deviceId')
      .sort({ createdAt: -1 })
      .limit(200);
    return ok(res, { repairs });
  } catch (e) {
    return fail(res, e.message, 500);
  }
}

export async function createRepair(req, res) {
  try {
    const { deviceId, issueDescription, priority, estimatedCompletionDate } = req.body;
    if (!deviceId || !issueDescription) return fail(res, 'deviceId and issueDescription required', 400);

    const device = await Device.findById(deviceId);
    if (!device) return fail(res, 'Device not found', 404);
    if (req.user.role === UserRole.CUSTOMER && device.customerId.toString() !== req.user.id) {
      return fail(res, 'Forbidden', 403);
    }

    const customerId = device.customerId;
    const repair = await RepairRequest.create({
      customerId,
      deviceId,
      issueDescription,
      priority,
      estimatedCompletionDate,
      currentStatus: RepairStatus.PENDING,
    });

    const populated = await RepairRequest.findById(repair._id).populate('deviceId');
    return ok(res, { repair: populated }, 201);
  } catch (e) {
    return fail(res, e.message, 500);
  }
}

export async function getRepair(req, res) {
  try {
    const repair = await RepairRequest.findById(req.params.id).populate('deviceId');
    if (!repair) return fail(res, 'Not found', 404);
    if (!(await canAccessRepair(req.user, repair))) return fail(res, 'Forbidden', 403);
    const partUsages = await Requires.find({ repairRequestId: repair._id })
      .populate('sparePartId', 'partName unitCost stockLevel')
      .sort({ createdAt: -1 });
    return ok(res, { repair, partUsages });
  } catch (e) {
    return fail(res, e.message, 500);
  }
}

export async function updateRepairStatus(req, res) {
  try {
    const repair = await RepairRequest.findById(req.params.id);
    if (!repair) return fail(res, 'Not found', 404);
    if (!(await canAccessRepair(req.user, repair))) return fail(res, 'Forbidden', 403);

    const { currentStatus, laborCharge, tax } = req.body;
    if (!currentStatus) return fail(res, 'currentStatus required', 400);

    // Customers can only cancel their own repair
    if (req.user.role === UserRole.CUSTOMER && currentStatus !== RepairStatus.CANCELLED) {
      return fail(res, 'Customers may only cancel a repair request', 403);
    }

    // Enforce valid status state machine transitions
    if (!canTransition(repair.currentStatus, currentStatus)) {
      return fail(res, `Invalid status transition: ${repair.currentStatus} → ${currentStatus}`, 400);
    }

    // Device must physically be at the technician before marking IN_PROGRESS
    if (currentStatus === RepairStatus.IN_PROGRESS) {
      const DeliveryJob = (await import('../models/DeliveryJob.js')).default;
      const deliveryJob = await DeliveryJob.findOne({ repairRequestId: repair._id });
      if (!deliveryJob || deliveryJob.status !== DeliveryJobStatus.AT_TECHNICIAN) {
        return fail(res, 'Cannot mark IN_PROGRESS — device has not arrived at technician yet', 400);
      }
    }

    const prev = repair.currentStatus;
    repair.currentStatus = currentStatus;
    await repair.save();

    await afterStatusChange(repair, prev, currentStatus, { laborCharge, tax });

    const populated = await RepairRequest.findById(repair._id).populate('deviceId');
    return ok(res, { repair: populated });
  } catch (e) {
    return fail(res, e.message, 500);
  }
}

export async function myAssignments(req, res) {
  try {
    if (![UserRole.LEAD_TECHNICIAN, UserRole.JUNIOR_TECHNICIAN].includes(req.user.role)) {
      return fail(res, 'Technicians only', 403);
    }
    const links = await AssignedTo.find({ technicianId: req.user.id }).populate({
      path: 'repairRequestId',
      populate: { path: 'deviceId' },
    });
    return ok(res, { assignments: links });
  } catch (e) {
    return fail(res, e.message, 500);
  }
}

async function canAccessRepair(user, repair) {
  if (user.role === UserRole.ADMIN) return true;
  if (user.role === UserRole.CUSTOMER && repair.customerId.toString() === user.id) return true;
  if ([UserRole.LEAD_TECHNICIAN, UserRole.JUNIOR_TECHNICIAN].includes(user.role)) {
    const a = await AssignedTo.findOne({ repairRequestId: repair._id, technicianId: user.id });
    return !!a;
  }
  return false;
}
