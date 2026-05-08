import { Router } from 'express';
import { requireAuth, requireRoles } from '../middlewares/auth.js';
import { UserRole } from '../utils/enums.js';
import { createBid, listBids, acceptBid, rejectBid } from '../controllers/bidController.js';

const router = Router();
router.use(requireAuth);

router.post('/:repairRequestId/bids',
  requireRoles(UserRole.LEAD_TECHNICIAN, UserRole.JUNIOR_TECHNICIAN),
  createBid
);
router.get('/:repairRequestId/bids',
  requireRoles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.LEAD_TECHNICIAN, UserRole.JUNIOR_TECHNICIAN),
  listBids
);
router.patch('/bids/:bidId/accept', requireRoles(UserRole.CUSTOMER), acceptBid);
router.patch('/bids/:bidId/reject', requireRoles(UserRole.CUSTOMER), rejectBid);

export default router;