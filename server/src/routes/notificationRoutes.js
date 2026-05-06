import { Router } from 'express';
import * as ctrl from '../controllers/notificationController.js';
import { requireAuth } from '../middlewares/auth.js';

const r = Router();
r.use(requireAuth);

r.get('/', ctrl.listNotifications);
r.get('/:id', ctrl.getNotification);

export default r;
