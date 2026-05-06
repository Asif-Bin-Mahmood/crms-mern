import { Router } from 'express';
import * as ctrl from '../controllers/sparePartController.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { UserRole } from '../utils/enums.js';

const r = Router();
r.use(requireAuth);

r.get('/', ctrl.listParts);
r.post('/', requireRoles(UserRole.ADMIN), ctrl.createPart);
r.patch('/:id', requireRoles(UserRole.ADMIN), ctrl.updatePart);
r.delete('/:id', requireRoles(UserRole.ADMIN), ctrl.deletePart);

export default r;
