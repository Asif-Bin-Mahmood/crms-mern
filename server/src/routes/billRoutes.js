import { Router } from 'express';
import * as ctrl from '../controllers/billController.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { UserRole } from '../utils/enums.js';

const r = Router();
r.use(requireAuth);

r.get('/', ctrl.listBills);
r.get('/:id', ctrl.getBill);
r.patch('/:id/payment', requireRoles(UserRole.ADMIN, UserRole.CUSTOMER), ctrl.updatePaymentStatus);

export default r;
