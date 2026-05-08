import { Router } from 'express';
import * as ctrl from '../controllers/repairController.js';
import * as assign from '../controllers/assignmentController.js';
import * as parts from '../controllers/sparePartController.js';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { UserRole } from '../utils/enums.js';

const r = Router();
r.use(requireAuth);

r.get('/', ctrl.listRepairs);
r.post('/', ctrl.createRepair);
r.get('/assignments/me', ctrl.myAssignments);
r.get('/:id', ctrl.getRepair);
r.patch('/:id/status', ctrl.updateRepairStatus);

r.post(
  '/:repairRequestId/assign',
  requireRoles(UserRole.ADMIN),
  assign.assignTechnician
);
r.get('/:repairRequestId/assignments', assign.listAssignments);
r.delete('/:repairRequestId/assignments/:technicianId', assign.removeAssignment);

r.post(
  '/:repairRequestId/parts',
  requireRoles(UserRole.ADMIN, UserRole.LEAD_TECHNICIAN, UserRole.JUNIOR_TECHNICIAN),
  parts.attachPartToRepair
);

export default r;
