import { Router } from 'express';
import * as ctrl from '../controllers/adminUserController.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { UserRole } from '../utils/enums.js';

const r = Router();
r.use(requireAuth, requireRoles(UserRole.ADMIN));

r.post('/users', ctrl.createUser);
r.get('/users', ctrl.listUsers);
r.get('/users/:id', ctrl.getUser);
r.patch('/users/:id', ctrl.updateUser);
r.delete('/users/:id', ctrl.deleteUser);

export default r;
