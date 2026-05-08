import { AssignedTo } from '../models/AssignedTo.js';
import { RepairRequest } from '../models/RepairRequest.js';
import { User } from '../models/User.js';
import { UserRole, RoleInRepair } from '../utils/enums.js';
import { ok, fail } from '../utils/response.js';

const techRoles = [UserRole.LEAD_TECHNICIAN, UserRole.JUNIOR_TECHNICIAN];

export async function assignTechnician(req, res) {
  try {
    const { repairRequestId } = req.params;
    const { technicianId } = req.body;

    if (!technicianId) return fail(res, 'technicianId required', 400);

    const repair = await RepairRequest.findById(repairRequestId);
    if (!repair) return fail(res, 'Repair request not found', 404);

    const tech = await User.findById(technicianId);
    if (!tech || !techRoles.includes(tech.role)) {
      return fail(res, 'Invalid technician', 400);
    }

    // Auto-detect roleInRepair from the technician user role
    const roleInRepair = tech.role === UserRole.LEAD_TECHNICIAN
      ? RoleInRepair.LEAD
      : RoleInRepair.JUNIOR;

    const doc = await AssignedTo.findOneAndUpdate(
      { repairRequestId, technicianId },
      {
        $set: { assignedDate: new Date(), roleInRepair },
        $setOnInsert: { repairRequestId, technicianId },
      },
      { upsert: true, new: true }
    );

    // NOTE: Delivery job is created by bidController when customer ACCEPTS a bid.
    // Admin assignment only registers the technician — delivery job created on bid acceptance.

    return ok(res, { assignment: doc }, 201);
  } catch (e) {
    return fail(res, e.message, 500);
  }
}

export async function listAssignments(req, res) {
  try {
    const { repairRequestId } = req.params;
    const items = await AssignedTo.find({ repairRequestId })
      .populate('technicianId', 'name email role');
    return ok(res, { assignments: items });
  } catch (e) {
    return fail(res, e.message, 500);
  }
}

export async function removeAssignment(req, res) {
  try {
    await AssignedTo.findOneAndDelete({
      repairRequestId: req.params.repairRequestId,
      technicianId: req.params.technicianId,
    });
    return ok(res, { deleted: true });
  } catch (e) {
    return fail(res, e.message, 500);
  }
}
