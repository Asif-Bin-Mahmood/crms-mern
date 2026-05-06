import { Router } from 'express';
import * as ctrl from '../controllers/analyticsController.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { UserRole } from '../utils/enums.js';

const r = Router();
r.use(requireAuth, requireRoles(UserRole.ADMIN));

r.get('/dashboard', ctrl.dashboard);
r.get('/repairs/volume', ctrl.repairVolume);

export default r;
