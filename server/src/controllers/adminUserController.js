import { User } from '../models/User.js';
import { UserRole } from '../utils/enums.js';
import { ok, fail } from '../utils/response.js';

const techRoles = [UserRole.LEAD_TECHNICIAN, UserRole.JUNIOR_TECHNICIAN];

export async function createUser(req, res) {
  try {
    const {
      name,
      email,
      password,
      role,
      technicianProfile,
      leadTechnicianProfile,
      juniorTechnicianProfile,
    } = req.body;

    if (!name || !email || !password || !role) {
      return fail(res, 'name, email, password, role required', 400);
    }

    if (![UserRole.ADMIN, ...techRoles, UserRole.CUSTOMER, UserRole.DELIVERY_MAN].includes(role)) {
      return fail(res, 'Invalid role', 400);
    }

    const exists = await User.findOne({ email });
    if (exists) return fail(res, 'Email already exists', 409);

    const passwordHash = await User.hashPassword(password);
    const doc = { name, email, passwordHash, role };

    if (role === UserRole.CUSTOMER) {
      doc.customerProfile = req.body.customerProfile || {};
    }
    if (techRoles.includes(role)) {
      doc.technicianProfile = technicianProfile || {};
      if (role === UserRole.LEAD_TECHNICIAN) {
        doc.leadTechnicianProfile = leadTechnicianProfile || {};
      }
      if (role === UserRole.JUNIOR_TECHNICIAN) {
        doc.juniorTechnicianProfile = juniorTechnicianProfile || {};
      }
    }

    const user = await User.create(doc);
    return ok(res, { user: sanitize(user) }, 201);
  } catch (e) {
    return fail(res, e.message, 500);
  }
}

export async function listUsers(req, res) {
  const users = await User.find().sort({ createdAt: -1 }).limit(200);
  return ok(res, { users: users.map(sanitize) });
}

export async function getUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) return fail(res, 'Not found', 404);
  return ok(res, { user: sanitize(user) });
}

export async function updateUser(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) return fail(res, 'Not found', 404);
  const { name, customerProfile, technicianProfile, leadTechnicianProfile, juniorTechnicianProfile } = req.body;
  if (name) user.name = name;
  if (customerProfile) user.customerProfile = { ...user.customerProfile, ...customerProfile };
  if (technicianProfile) user.technicianProfile = { ...user.technicianProfile, ...technicianProfile };
  if (leadTechnicianProfile) user.leadTechnicianProfile = { ...user.leadTechnicianProfile, ...leadTechnicianProfile };
  if (juniorTechnicianProfile) user.juniorTechnicianProfile = { ...user.juniorTechnicianProfile, ...juniorTechnicianProfile };
  await user.save();
  return ok(res, { user: sanitize(user) });
}

export async function deleteUser(req, res) {
  if (req.params.id === req.user.id) return fail(res, 'Cannot delete self', 400);
  await User.findByIdAndDelete(req.params.id);
  return ok(res, { deleted: true });
}

function sanitize(u) {
  const o = u.toObject ? u.toObject() : u;
  delete o.passwordHash;
  return o;
}
