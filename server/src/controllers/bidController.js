import { Bid } from '../models/Bid.js';
import { RepairRequest } from '../models/RepairRequest.js';
import { AssignedTo } from '../models/AssignedTo.js';
import { User } from '../models/User.js';
import DeliveryJob from '../models/DeliveryJob.js';
import { BidStatus, UserRole, DeliveryJobStatus, RoleInRepair, RepairStatus } from '../utils/enums.js';
import { ok, fail } from '../utils/response.js';

export async function createBid(req, res) {
  try {
    const { repairRequestId } = req.params;
    const { estimatedAmount, estimatedDays, message } = req.body;

    if (!estimatedAmount || !estimatedDays) {
      return fail(res, 'estimatedAmount and estimatedDays required', 400);
    }
    if (Number(estimatedAmount) <= 0) {
      return fail(res, 'estimatedAmount must be a positive number', 400);
    }
    if (Number(estimatedDays) <= 0) {
      return fail(res, 'estimatedDays must be a positive number', 400);
    }

    const repair = await RepairRequest.findById(repairRequestId);
    if (!repair) return fail(res, 'Repair not found', 404);
    if (repair.currentStatus !== RepairStatus.PENDING) {
      return fail(res, 'Can only bid on PENDING repairs', 400);
    }

    const bid = await Bid.findOneAndUpdate(
      { repairRequestId, technicianId: req.user.id },
      {
        estimatedAmount: Number(estimatedAmount),
        estimatedDays:   Number(estimatedDays),
        message:         message || '',
        status:          BidStatus.PENDING,
      },
      { upsert: true, new: true }
    );

    return ok(res, { bid }, 201);
  } catch (err) {
    return fail(res, err.message, 500);
  }
}


export async function listBids(req, res) {
  try {
    const { repairRequestId } = req.params;
    const repair = await RepairRequest.findById(repairRequestId);
    if (!repair) return fail(res, 'Repair not found', 404);

    if (req.user.role === UserRole.CUSTOMER &&
        repair.customerId.toString() !== req.user.id) {
      return fail(res, 'Forbidden', 403);
    }

    const bids = await Bid.find({ repairRequestId })
      .populate('technicianId', 'name email role')
      .sort({ estimatedAmount: 1 }); 

    return ok(res, { bids });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}


export async function acceptBid(req, res) {
  try {
    const { bidId } = req.params;
    const bid = await Bid.findById(bidId).populate('technicianId', 'name role');
    if (!bid) return fail(res, 'Bid not found', 404);

    const repair = await RepairRequest.findById(bid.repairRequestId);
    if (!repair) return fail(res, 'Repair not found', 404);

    if (repair.customerId.toString() !== req.user.id) {
      return fail(res, 'Forbidden', 403);
    }
    if (bid.status !== BidStatus.PENDING) {
      return fail(res, `Cannot accept a bid that is already ${bid.status}`, 400);
    }
    if (repair.currentStatus !== RepairStatus.PENDING) {
      return fail(res, 'A bid has already been accepted for this repair', 400);
    }

   
    bid.status = BidStatus.ACCEPTED;
    await bid.save();
    await Bid.updateMany(
      { repairRequestId: bid.repairRequestId, _id: { $ne: bidId } },
      { status: BidStatus.REJECTED }
    );

    const roleInRepair = bid.technicianId?.role === 'LEAD_TECHNICIAN'
      ? RoleInRepair.LEAD : RoleInRepair.JUNIOR;
    await AssignedTo.findOneAndUpdate(
      { repairRequestId: repair._id, technicianId: bid.technicianId._id },
      {
        $set: { assignedDate: new Date(), roleInRepair },
        $setOnInsert: { repairRequestId: repair._id, technicianId: bid.technicianId._id },
      },
      { upsert: true }
    );

   
    const existing = await DeliveryJob.findOne({ repairRequestId: repair._id });
    if (!existing) {
      await DeliveryJob.create({
        repairRequestId:  repair._id,
        customerId:       repair.customerId,
        customerAddress:  repair.customerAddress || 'Not provided',
        customerPhone:    repair.customerPhone   || 'Not provided',
        status:           DeliveryJobStatus.PENDING_PICKUP,
        statusHistory: [{
          status: DeliveryJobStatus.PENDING_PICKUP,
          note: `Bid accepted — pickup requested`,
        }],
      });
    }

    return ok(res, { bid, message: 'Bid accepted! Delivery men notified for pickup.' });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}


export async function rejectBid(req, res) {
  try {
    const { bidId } = req.params;
    const bid = await Bid.findById(bidId);
    if (!bid) return fail(res, 'Bid not found', 404);

    const repair = await RepairRequest.findById(bid.repairRequestId);
    if (!repair) return fail(res, 'Repair not found', 404);
    if (repair.customerId.toString() !== req.user.id) {
      return fail(res, 'Forbidden', 403);
    }
    if (bid.status === BidStatus.ACCEPTED) {
      return fail(res, 'Cannot reject a bid that has already been accepted', 400);
    }
    if (bid.status === BidStatus.REJECTED) {
      return fail(res, 'Bid is already rejected', 400);
    }

    bid.status = BidStatus.REJECTED;
    await bid.save();
    return ok(res, { bid });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}