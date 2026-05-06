import { SparePart } from '../models/SparePart.js';
import { RepairRequest } from '../models/RepairRequest.js';
import { AssignedTo } from '../models/AssignedTo.js';
import { UserRole, RepairStatus } from '../utils/enums.js';
import { ok, fail } from '../utils/response.js';
import { addPartUsage } from '../services/inventoryService.js';

export async function listParts(req, res) {
  const low = req.query.lowStock === 'true';
  let q = {};
  if (low) {
    const all = await SparePart.find();
    const filtered = all.filter((p) => p.isLowStock());
    return ok(res, { spareParts: filtered });
  }
  const spareParts = await SparePart.find().sort({ partName: 1 });
  return ok(res, { spareParts });
}

export async function createPart(req, res) {
  try {
    const { partName, stockLevel, unitCost, supplierName, reorderThreshold } = req.body;
    if (!partName || unitCost == null || !supplierName) {
      return fail(res, 'partName, unitCost, supplierName required', 400);
    }
    const sparePart = await SparePart.create({
      partName,
      stockLevel: stockLevel ?? 0,
      unitCost,
      supplierName,
      reorderThreshold: reorderThreshold ?? 5,
    });
    return ok(res, { sparePart }, 201);
  } catch (e) {
    return fail(res, e.message, 500);
  }
}

export async function updatePart(req, res) {
  const sparePart = await SparePart.findById(req.params.id);
  if (!sparePart) return fail(res, 'Not found', 404);
  Object.assign(sparePart, req.body);
  await sparePart.save();
  return ok(res, { sparePart });
}

export async function deletePart(req, res) {
  await SparePart.findByIdAndDelete(req.params.id);
  return ok(res, { deleted: true });
}

export async function attachPartToRepair(req, res) {
  try {
    const { repairRequestId } = req.params;
    const { sparePartId, quantityUsed } = req.body;
    if (!sparePartId || quantityUsed == null) {
      return fail(res, 'sparePartId and quantityUsed required', 400);
    }

    const qty = Number(quantityUsed);
    if (!Number.isInteger(qty) || qty < 1) {
      return fail(res, 'quantityUsed must be a positive integer', 400);
    }

    const repair = await RepairRequest.findById(repairRequestId);
    if (!repair) return fail(res, 'Repair request not found', 404);

    if (repair.currentStatus === RepairStatus.COMPLETED || repair.currentStatus === RepairStatus.CANCELLED) {
      return fail(res, 'Cannot attach parts to completed or cancelled repairs', 400);
    }

    const canAttach = await canAttachPartToRepair(req.user, repair._id, repair.customerId);
    if (!canAttach) return fail(res, 'Forbidden', 403);

    const result = await addPartUsage(repairRequestId, sparePartId, qty);
    return ok(res, result, 201);
  } catch (e) {
    const status = e.status || 500;
    return fail(res, e.message, status);
  }
}

async function canAttachPartToRepair(user, repairRequestId, customerId) {
  if (user.role === UserRole.ADMIN) return true;
  if (user.role === UserRole.CUSTOMER) return String(customerId) === user.id;
  if ([UserRole.LEAD_TECHNICIAN, UserRole.JUNIOR_TECHNICIAN].includes(user.role)) {
    const assignment = await AssignedTo.findOne({ repairRequestId, technicianId: user.id }).select('_id');
    return !!assignment;
  }
  return false;
}
