import { AssignedTo } from '../models/AssignedTo.js';
import DeliveryJob from '../models/DeliveryJob.js';
import { RepairRequest } from '../models/RepairRequest.js';
import { User } from '../models/User.js';
import { UserRole } from '../utils/enums.js';
import { DeliveryJobStatus, RoleInRepair } from '../utils/enums.js';
import { ok, fail } from '../utils/response.js';

const techRoles = [UserRole.LEAD_TECHNICIAN, UserRole.JUNIOR_TECHNICIAN];

export async function assignTechnician(req, res) {
  try {
    const { repairRequestId } = req.params;
    const { technicianId, roleInRepair } = req.body;

    const repair = await RepairRequest.findById(repairRequestId);
    if (!repair) return fail(res, 'Repair request not found', 404);

    const tech = await User.findById(technicianId);
    if (!tech || !techRoles.includes(tech.role)) {
      return fail(res, 'Invalid technician', 400);
    }

    const doc = await AssignedTo.findOneAndUpdate(
      { repairRequestId, technicianId },
      {
        $set: {
          assignedDate: new Date(),
          roleInRepair: roleInRepair || RoleInRepair.SUPPORT,
        },
        $setOnInsert: {
          repairRequestId,
          technicianId,
        },
      },
      { upsert: true, new: true }
    );

    const existingDeliveryJob = await DeliveryJob.findOne({ repairRequestId });
    if (!existingDeliveryJob) {
      await DeliveryJob.create({
        repairRequestId: repair._id,
        customerId: repair.customerId,
        customerAddress: repair.customerAddress || 'Not provided',
        customerPhone: repair.customerPhone || 'Not provided',
        status: DeliveryJobStatus.PENDING_PICKUP,
        statusHistory: [{
          status: DeliveryJobStatus.PENDING_PICKUP,
          note: 'Technician assigned - pickup requested',
        }],
      });
    }

    return ok(res, { assignment: doc }, 201);
  } catch (e) {
    return fail(res, e.message, 500);
  }
}

export async function listAssignments(req, res) {
  const { repairRequestId } = req.params;
  const items = await AssignedTo.find({ repairRequestId }).populate('technicianId', 'name email role');
  return ok(res, { assignments: items });
}

export async function removeAssignment(req, res) {
  await AssignedTo.findOneAndDelete({
    repairRequestId: req.params.repairRequestId,
    technicianId: req.params.technicianId,
  });
  return ok(res, { deleted: true });
}
