import { Router } from 'express';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { UserRole } from '../utils/enums.js';
import * as paymentController from '../controllers/paymentController.js';
import * as mockPaymentController from '../controllers/mockPaymentController.js';
import { generateReceipt } from '../controllers/receiptController.js';

const router = Router();

// Endpoint for customer to initiate a payment
router.post('/init', requireAuth, requireRoles(UserRole.CUSTOMER, UserRole.ADMIN), paymentController.initPayment);

// SSLCommerz redirects via GET for success/fail/cancel
// IPN is POST (server-to-server)
router.get('/success', paymentController.paymentSuccess);
router.get('/fail', paymentController.paymentFail);
router.get('/cancel', paymentController.paymentCancel);
router.post('/ipn', paymentController.paymentIpn);

// ── Demo / Mock Payment Simulator (dev + QA only) ──────────────────────────
// GET  /api/payment/demo/status  — check if demo mode is active
// POST /api/payment/demo/pay     — process a mock payment
router.get('/demo/status', mockPaymentController.demoStatus);
router.post(
  '/demo/pay',
  requireAuth,
  requireRoles(UserRole.CUSTOMER, UserRole.ADMIN),
  mockPaymentController.demoPayment
);

// GET /api/payment/demo/receipt/:transactionId — download PDF receipt
// requireAuth ensures only logged-in users can download their receipts
router.get('/demo/receipt/:transactionId', requireAuth, generateReceipt);

export default router;
