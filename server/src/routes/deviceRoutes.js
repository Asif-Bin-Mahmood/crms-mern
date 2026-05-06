import { Router } from 'express';
import * as ctrl from '../controllers/deviceController.js';
import { requireAuth } from '../middlewares/auth.js';

const r = Router();
r.use(requireAuth);

r.get('/', ctrl.listDevices);
r.post('/', ctrl.createDevice);
r.get('/:id', ctrl.getDevice);
r.patch('/:id', ctrl.updateDevice);
r.delete('/:id', ctrl.deleteDevice);

export default r;
