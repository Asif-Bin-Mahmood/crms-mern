import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  if (env.nodeEnv !== 'production') {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  return res.status(status).json({
    success: false,
    message,
    ...(env.nodeEnv !== 'production' && err.stack ? { stack: err.stack } : {}),
  });
}

export function notFoundHandler(req, res) {
  return res.status(404).json({ success: false, message: 'Route not found' });
}
