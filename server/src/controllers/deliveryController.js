import DeliveryJob from '../models/DeliveryJob.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';
import { Bill } from '../models/Bill.js';
import { DeliveryJobStatus } from '../utils/enums.js';
import { ok, fail } from '../utils/response.js';


const DM_TRANSITIONS = {
  [DeliveryJobStatus.GOING_TO_CUSTOMER]:         [DeliveryJobStatus.PICKED_UP],
  [DeliveryJobStatus.PICKED_UP]:                 [DeliveryJobStatus.AT_WAREHOUSE],
  [DeliveryJobStatus.GOING_TO_TECHNICIAN]:       [DeliveryJobStatus.AT_TECHNICIAN],
  [DeliveryJobStatus.GOING_TO_WAREHOUSE_RETURN]: [DeliveryJobStatus.AT_WAREHOUSE_FINAL],
  [DeliveryJobStatus.OUT_FOR_DELIVERY]:          [DeliveryJobStatus.DELIVERED],
};


const AUTO_ADVANCE = {
  [DeliveryJobStatus.AT_WAREHOUSE]:       DeliveryJobStatus.PENDING_TECH_DELIVERY,
  [DeliveryJobStatus.AT_WAREHOUSE_FINAL]: DeliveryJobStatus.PENDING_CUSTOMER_DELIVERY,
};


const ACCEPT_MAP = {
  [DeliveryJobStatus.PENDING_PICKUP]:            DeliveryJobStatus.GOING_TO_CUSTOMER,
  [DeliveryJobStatus.PENDING_TECH_DELIVERY]:     DeliveryJobStatus.GOING_TO_TECHNICIAN,
  [DeliveryJobStatus.PENDING_RETURN]:            DeliveryJobStatus.GOING_TO_WAREHOUSE_RETURN,
  [DeliveryJobStatus.PENDING_CUSTOMER_DELIVERY]: DeliveryJobStatus.OUT_FOR_DELIVERY,
};


export async function acceptDeliveryJob(req, res) {
  try {
    const { id } = req.params;
    const job = await DeliveryJob.findById(id);
    if (!job) return fail(res, 'Delivery job not found', 404);

    const nextStatus = ACCEPT_MAP[job.status];
    if (!nextStatus) {
      return fail(res, `Job is not available for acceptance (current: ${job.status})`, 400);
    }
    if (job.deliveryManId) {
      return fail(res, 'Job already taken by another delivery man', 400);
    }

    job.deliveryManId = req.user.id;
    job.status = nextStatus;
    job.statusHistory.push({
      status:    nextStatus,
      note:      'Accepted by delivery man',
      moverName: req.user.id,
    });
    await job.save();

    const populated = await DeliveryJob.findById(job._id)
      .populate('customerId',      'name email')
      .populate('repairRequestId', 'issueDescription currentStatus')
      .populate('deliveryManId',   'name email');

    return ok(res, { job: populated });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}


export async function updateDeliveryStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const job = await DeliveryJob.findById(id);
    if (!job) return fail(res, 'Delivery job not found', 404);
    if (!job.deliveryManId || job.deliveryManId.toString() !== req.user.id) {
      return fail(res, 'You can only update your own delivery job', 403);
    }

    const allowed = DM_TRANSITIONS[job.status] || [];
    if (!allowed.includes(status)) {
      return fail(res, `Cannot move from ${job.status} to ${status}`, 400);
    }

    
    if (status === DeliveryJobStatus.PICKED_UP)  job.pickedUpAt  = new Date();
    if (status === DeliveryJobStatus.DELIVERED)  job.deliveredAt = new Date();

    job.status = status;
    job.statusHistory.push({ status, note: note || '', moverName: req.user.id });

    
    const autoNext = AUTO_ADVANCE[status];
    if (autoNext) {
      job.deliveryManId = null; // এই leg এর DM এর কাজ শেষ
      job.status = autoNext;
      job.statusHistory.push({
        status: autoNext,
        note:   'Auto-advanced to next leg — awaiting delivery man',
      });
    }

    await job.save();

    const populated = await DeliveryJob.findById(job._id)
      .populate('customerId',      'name email')
      .populate('repairRequestId', 'issueDescription currentStatus')
      .populate('deliveryManId',   'name email');

    return ok(res, { job: populated });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}


export async function listAvailableJobs(req, res) {
  try {
    const pendingStatuses = [
      DeliveryJobStatus.PENDING_PICKUP,
      DeliveryJobStatus.PENDING_TECH_DELIVERY,
      DeliveryJobStatus.PENDING_RETURN,
      DeliveryJobStatus.PENDING_CUSTOMER_DELIVERY,
    ];
    const jobs = await DeliveryJob.find({
      status: { $in: pendingStatuses },
      deliveryManId: null,
    })
      .populate('repairRequestId', 'issueDescription currentStatus')
      .populate('customerId', 'name email')
      .sort({ updatedAt: 1 });

    return ok(res, { jobs });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}


export async function listMyJobs(req, res) {
  try {
    const jobs = await DeliveryJob.find({ deliveryManId: req.user.id })
      .populate('repairRequestId', 'issueDescription currentStatus')
      .populate('customerId', 'name email')
      .sort({ updatedAt: -1 });
    return ok(res, { jobs });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}


export async function getDeliveryJobByRepair(req, res) {
  try {
    const job = await DeliveryJob.findOne({ repairRequestId: req.params.repairId })
      .populate('repairRequestId', 'issueDescription currentStatus')
      .populate('customerId',      'name email')
      .populate('deliveryManId',   'name email');
    if (!job) return fail(res, 'No delivery job found', 404);
    if (req.user.role === 'CUSTOMER' && job.customerId?._id?.toString() !== req.user.id) {
      return fail(res, 'Forbidden', 403);
    }
    return ok(res, { job });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}


export async function getDeliveryJob(req, res) {
  try {
    const job = await DeliveryJob.findById(req.params.id)
      .populate('repairRequestId', 'issueDescription currentStatus')
      .populate('customerId',      'name email')
      .populate('deliveryManId',   'name email');
    if (!job) return fail(res, 'Not found', 404);
    return ok(res, { job });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}


export async function listDeliveryJobs(req, res) {
  try {
    const jobs = await DeliveryJob.find()
      .populate('repairRequestId', 'issueDescription currentStatus')
      .populate('customerId',      'name email')
      .populate('deliveryManId',   'name email')
      .sort({ updatedAt: -1 });
    return ok(res, { jobs });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}


// ── Customer Payment History (for Delivery Man) ──────────────────────────────
export async function getCustomerPaymentHistory(req, res) {
  try {
    // Fetch all successful payments, newest first
    const payments = await PaymentTransaction.find({ status: 'SUCCESS' })
      .populate('customerId', 'name email phone')
      .populate({
        path: 'billId',
        select: 'laborCharge tax partsCost paymentStatus repairRequestId',
        populate: {
          path: 'repairRequestId',
          select: 'issueDescription currentStatus',
        },
      })
      .sort({ paidAt: -1 })
      .lean();

    // Shape the response so the frontend has everything it needs
    const history = payments.map((p) => ({
      paymentId:       p._id,
      transactionId:   p.transactionId,
      amount:          p.amount,
      currency:        p.currency,
      paymentMethod:   p.paymentMethod,
      paidAt:          p.paidAt,
      customerName:    p.customerId?.name  || 'N/A',
      customerEmail:   p.customerId?.email || 'N/A',
      issue:           p.billId?.repairRequestId?.issueDescription || 'N/A',
      repairStatus:    p.billId?.repairRequestId?.currentStatus    || 'N/A',
      laborCharge:     p.billId?.laborCharge  ?? 0,
      partsCost:       p.billId?.partsCost    ?? 0,
      tax:             p.billId?.tax          ?? 0,
    }));

    return ok(res, { history });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}
