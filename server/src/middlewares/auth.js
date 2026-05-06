import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { fail } from '../utils/response.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return fail(res, 'Unauthorized', 401);
    }
    const token = header.slice(7);
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub);
    if (!user) return fail(res, 'Unauthorized', 401);
    req.user = { id: user._id.toString(), role: user.role, doc: user };
    return next();
  } catch {
    return fail(res, 'Unauthorized', 401);
  }
}

export function requireRoles(...allowed) {
  return (req, res, next) => {
    if (!req.user) return fail(res, 'Unauthorized', 401);
    if (!allowed.includes(req.user.role)) {
      return fail(res, 'Forbidden', 403);
    }
    return next();
  };
}
