import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';

const r = Router();
r.post('/register', auth.register);
r.post('/login', auth.login);
r.get('/me', requireAuth, auth.me);

export default r;
