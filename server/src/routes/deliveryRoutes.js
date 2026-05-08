import { Router } from "express";
import { requireAuth, requireRoles } from "../middlewares/auth.js";
import { UserRole } from "../utils/enums.js";
import { ok, fail } from "../utils/response.js";
import DeliveryJob from "../models/DeliveryJob.js";
import {
  acceptDeliveryJob,
  updateDeliveryStatus,
  listAvailableJobs,
  listMyJobs,
  getDeliveryJobByRepair,
  getDeliveryJob,
  listDeliveryJobs,
  getCustomerPaymentHistory,
} from "../controllers/deliveryController.js";

const router = Router();
router.use(requireAuth);

// ── Delivery Man routes ──────────────────────────────────────────────────────
router.get("/available",       requireRoles(UserRole.DELIVERY_MAN), listAvailableJobs);
router.get("/my-jobs",         requireRoles(UserRole.DELIVERY_MAN), listMyJobs);
router.get("/payment-history", requireRoles(UserRole.DELIVERY_MAN), getCustomerPaymentHistory);
router.post("/:id/accept",     requireRoles(UserRole.DELIVERY_MAN), acceptDeliveryJob);
router.patch("/:id/status",    requireRoles(UserRole.DELIVERY_MAN), updateDeliveryStatus);

// ── Shared tracking route (customer, admin, technicians, delivery man) ────────
router.get(
  "/by-repair/:repairId",
  requireRoles(
    UserRole.ADMIN,
    UserRole.CUSTOMER,
    UserRole.LEAD_TECHNICIAN,
    UserRole.JUNIOR_TECHNICIAN,
    UserRole.DELIVERY_MAN
  ),
  getDeliveryJobByRepair
);

// ── Admin routes ─────────────────────────────────────────────────────────────
router.get("/", requireRoles(UserRole.ADMIN), listDeliveryJobs);
router.delete("/:id", requireRoles(UserRole.ADMIN), async (req, res) => {
  try {
    await DeliveryJob.findByIdAndDelete(req.params.id);
    return ok(res, { deleted: true });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ── Single job detail ─────────────────────────────────────────────────────────
router.get(
  "/:id",
  requireRoles(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.DELIVERY_MAN),
  getDeliveryJob
);

export default router;
