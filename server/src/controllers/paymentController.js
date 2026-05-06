import SSLCommerzPayment from 'sslcommerz-lts';
import { Bill } from '../models/Bill.js';
import { PaymentStatus, NotificationTarget, DeliveryType } from '../utils/enums.js';
import { env } from '../config/env.js';
import { ok, fail } from '../utils/response.js';
import { notifyRepairEvent } from '../services/notificationService.js';
import { UserRole } from '../utils/enums.js';

// Store pending tran_id -> billId map in memory (simple; use Redis/DB in production)
const pendingTransactions = new Map();

export async function initPayment(req, res) {
  try {
    const { billId } = req.body;
    if (!billId) return fail(res, 'billId is required', 400);

    const bill = await Bill.findById(billId).populate('customerId').populate('repairRequestId');

    if (!bill) return fail(res, 'Bill not found', 404);

    // Authorization check
    if (req.user.role === UserRole.CUSTOMER && bill.customerId._id.toString() !== req.user.id) {
      return fail(res, 'Forbidden', 403);
    }

    if (bill.paymentStatus === PaymentStatus.PAID) {
      return fail(res, 'Bill is already paid', 400);
    }

    const amount = bill.getTotalAmount();
    if (amount <= 0) return fail(res, 'Bill amount must be greater than 0', 400);

    const transactionId = `CRMS_${Date.now()}_${bill._id.toString().slice(-6)}`;

    // Store mapping so webhook can find bill
    pendingTransactions.set(transactionId, bill._id.toString());

    const data = {
      total_amount: amount,
      currency: 'BDT',
      tran_id: transactionId,
      success_url: `http://localhost:${env.port}/api/payment/success?billId=${bill._id}&tran_id=${transactionId}`,
      fail_url: `http://localhost:${env.port}/api/payment/fail?billId=${bill._id}`,
      cancel_url: `http://localhost:${env.port}/api/payment/cancel?billId=${bill._id}`,
      ipn_url: `http://localhost:${env.port}/api/payment/ipn`,
      shipping_method: 'No',
      product_name: 'Computer Repair Service',
      product_category: 'Service',
      product_profile: 'general',
      cus_name: bill.customerId.name || 'Customer',
      cus_email: bill.customerId.email,
      cus_add1: bill.customerId.customerProfile?.houseNo || 'N/A',
      cus_add2: bill.customerId.customerProfile?.streetNo || 'N/A',
      cus_city: bill.customerId.customerProfile?.city || 'Dhaka',
      cus_state: bill.customerId.customerProfile?.city || 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: bill.customerId.customerProfile?.phnNum || '01700000000',
      cus_fax: bill.customerId.customerProfile?.phnNum || '01700000000',
      ship_name: bill.customerId.name || 'Customer',
      ship_add1: 'Dhaka',
      ship_add2: 'Dhaka',
      ship_city: 'Dhaka',
      ship_state: 'Dhaka',
      ship_postcode: 1000,
      ship_country: 'Bangladesh',
    };

    const sslcz = new SSLCommerzPayment(
      env.sslCommerzStoreId,
      env.sslCommerzStorePassword,
      env.sslCommerzIsLive
    );

    const apiResponse = await sslcz.init(data);

    if (!apiResponse || !apiResponse.GatewayPageURL) {
      return fail(res, `SSLCommerz init failed: ${apiResponse?.failedreason || 'No gateway URL returned'}`, 502);
    }

    return ok(res, { gatewayUrl: apiResponse.GatewayPageURL, transactionId });
  } catch (err) {
    console.error('[paymentController.initPayment] error:', err);
    return fail(res, err.message, 500);
  }
}

export async function paymentSuccess(req, res) {
  try {
    // SSLCommerz sends billId and tran_id as query params on GET redirect
    const billId = req.query.billId || req.body?.billId;
    const bill = await Bill.findById(billId);

    if (bill && bill.paymentStatus !== PaymentStatus.PAID) {
      bill.paymentStatus = PaymentStatus.PAID;
      await bill.save();

      try {
        await notifyRepairEvent(
          bill.repairRequestId,
          `Payment successful for Bill ${bill._id.toString().slice(-8).toUpperCase()}. Status: PAID.`,
          NotificationTarget.CUSTOMER,
          DeliveryType.EMAIL
        );
      } catch (notifyErr) {
        console.warn('[paymentSuccess] Notification failed (non-fatal):', notifyErr.message);
      }
    }

    res.redirect(`${env.clientUrl}/payment/success`);
  } catch (err) {
    console.error('[paymentController.paymentSuccess] error:', err);
    res.redirect(`${env.clientUrl}/payment/fail`);
  }
}

export async function paymentFail(req, res) {
  try {
    const billId = req.query.billId || req.body?.billId;
    const bill = await Bill.findById(billId);

    if (bill && bill.paymentStatus === PaymentStatus.PENDING) {
      bill.paymentStatus = PaymentStatus.FAILED;
      await bill.save();
    }
  } catch (err) {
    console.warn('[paymentFail] DB update error (non-fatal):', err.message);
  }

  res.redirect(`${env.clientUrl}/payment/fail`);
}

export async function paymentCancel(req, res) {
  res.redirect(`${env.clientUrl}/payment/fail?reason=cancel`);
}

export async function paymentIpn(req, res) {
  // IPN: server-to-server POST from SSLCommerz
  // In production: verify signature with val_id API call
  const { tran_id, status } = req.body || {};
  console.log('[IPN received]', { tran_id, status });
  res.status(200).json({ message: 'IPN received' });
}
