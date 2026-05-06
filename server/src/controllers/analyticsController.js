import { RepairRequest } from '../models/RepairRequest.js';
import { User } from '../models/User.js';
import { SparePart } from '../models/SparePart.js';
import { Bill } from '../models/Bill.js';
import { AssignedTo } from '../models/AssignedTo.js';
import { UserRole } from '../utils/enums.js';
import { PaymentStatus } from '../utils/enums.js';
import { ok } from '../utils/response.js';

export async function dashboard(req, res) {
  const [
    totalUsers,
    totalCustomers,
    totalTechs,
    repairsByStatus,
    lowStockParts,
    billsPending,
    assignmentCounts,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: UserRole.CUSTOMER }),
    User.countDocuments({ role: { $in: [UserRole.LEAD_TECHNICIAN, UserRole.JUNIOR_TECHNICIAN] } }),
    RepairRequest.aggregate([
      { $group: { _id: '$currentStatus', count: { $sum: 1 } } },
    ]),
    SparePart.find().then((parts) => parts.filter((p) => p.isLowStock()).length),
    Bill.countDocuments({ paymentStatus: PaymentStatus.PENDING }),
    AssignedTo.aggregate([
      { $group: { _id: '$technicianId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return ok(res, {
    summary: {
      totalUsers,
      totalCustomers,
      totalTechnicians: totalTechs,
      repairsByStatus,
      lowStockPartsCount: lowStockParts,
      pendingBillsCount: billsPending,
      topTechniciansByAssignments: assignmentCounts,
    },
  });
}

export async function repairVolume(req, res) {
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const data = await RepairRequest.aggregate([
    { $match: { createdAt: { $gte: last30 } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return ok(res, { repairVolumeLast30Days: data });
}
