import { User } from '../models/User.js';
import { UserRole } from '../utils/enums.js';
import { signToken } from '../utils/jwt.js';
import { ok, fail } from '../utils/response.js';

export async function register(req, res) {
  try {
    const { name, email, password, role, customerProfile } = req.body;
    if (!name || !email || !password) {
      return fail(res, 'name, email, password required', 400);
    }
    const allowedSelfRegister = [UserRole.CUSTOMER, UserRole.DELIVERY_MAN];
    const r = role || UserRole.CUSTOMER;
    if (!allowedSelfRegister.includes(r)) {
      return fail(res, 'Only CUSTOMER self-registration is allowed', 403);
    }
    const exists = await User.findOne({ email });
    if (exists) return fail(res, 'Email already registered', 409);

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: r,
      customerProfile: customerProfile || {},
    });

    const token = signToken({ sub: user._id.toString(), role: user.role });
    return ok(res, { user: sanitizeUser(user), token }, 201);
  } catch (e) {
    return fail(res, e.message, 500);
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return fail(res, 'email and password required', 400);
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      return fail(res, 'Invalid credentials', 401);
    }
    const token = signToken({ sub: user._id.toString(), role: user.role });
    return ok(res, { user: sanitizeUser(user), token });
  } catch (e) {
    return fail(res, e.message, 500);
  }
}

export async function me(req, res) {
  const user = await User.findById(req.user.id);
  return ok(res, { user: sanitizeUser(user) });
}

function sanitizeUser(user) {
  if (!user) return null;
  const o = user.toObject ? user.toObject() : user;
  delete o.passwordHash;
  return o;
}
