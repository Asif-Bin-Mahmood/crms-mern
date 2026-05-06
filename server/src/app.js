import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import repairRoutes from './routes/repairRoutes.js';
import sparePartRoutes from './routes/sparePartRoutes.js';
import billRoutes from './routes/billRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import bidRoutes from './routes/bidRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json());
  app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

  app.get('/api/health', (req, res) => res.json({ ok: true, service: 'crms-api' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/devices', deviceRoutes);
  app.use('/api/repairs', repairRoutes);
  app.use('/api/spare-parts', sparePartRoutes);
  app.use('/api/bills', billRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/delivery', deliveryRoutes);
  app.use('/api/repairs', bidRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
