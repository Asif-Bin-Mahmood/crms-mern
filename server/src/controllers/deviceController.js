import { Device } from '../models/Device.js';
import { UserRole } from '../utils/enums.js';
import { ok, fail } from '../utils/response.js';

export async function listDevices(req, res) {
  let q = {};
  if (req.user.role === UserRole.CUSTOMER) {
    q.customerId = req.user.id;
  } else if (req.query.customerId) {
    q.customerId = req.query.customerId;
  }
  const devices = await Device.find(q).sort({ createdAt: -1 });
  return ok(res, { devices });
}

export async function createDevice(req, res) {
  try {
    const customerId = req.user.role === UserRole.CUSTOMER ? req.user.id : req.body.customerId;
    if (!customerId) return fail(res, 'customerId required', 400);
    const { dType, manufacturer, model, serialNo } = req.body;
    if (!dType || !manufacturer || !model || !serialNo) {
      return fail(res, 'dType, manufacturer, model, serialNo required', 400);
    }
    const device = await Device.create({ customerId, dType, manufacturer, model, serialNo });
    return ok(res, { device }, 201);
  } catch (e) {
    if (e.code === 11000) return fail(res, 'Serial number already registered for this customer', 409);
    return fail(res, e.message, 500);
  }
}

export async function getDevice(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return fail(res, 'Not found', 404);
  if (req.user.role === UserRole.CUSTOMER && device.customerId.toString() !== req.user.id) {
    return fail(res, 'Forbidden', 403);
  }
  return ok(res, { device });
}

export async function updateDevice(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return fail(res, 'Not found', 404);
  if (req.user.role === UserRole.CUSTOMER && device.customerId.toString() !== req.user.id) {
    return fail(res, 'Forbidden', 403);
  }
  Object.assign(device, req.body);
  await device.save();
  return ok(res, { device });
}

export async function deleteDevice(req, res) {
  const device = await Device.findById(req.params.id);
  if (!device) return fail(res, 'Not found', 404);
  if (req.user.role === UserRole.CUSTOMER && device.customerId.toString() !== req.user.id) {
    return fail(res, 'Forbidden', 403);
  }
  await device.deleteOne();
  return ok(res, { deleted: true });
}
