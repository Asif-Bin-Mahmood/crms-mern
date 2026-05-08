# Bug Report — CRMS Sprint 3 Full Review
# =========================================

BUGS_FOUND = """
1. repairController.js line 83-89
   BUG: updateRepairStatus allows CANCELLED → IN_PROGRESS (no canTransition guard used)
   The `canTransition` function is imported but NEVER called. So a technician can
   set any status without following PENDING→IN_PROGRESS→COMPLETED order.

2. repairController.js line 70-99
   BUG: updateRepairStatus has no try/catch — unhandled DB errors crash with 500 stack traces.

3. assignmentController.js line 39-52
   BUG: assignTechnician creates a DeliveryJob when admin manually assigns a technician.
   But Sprint 3 flow says delivery job is created AFTER customer accepts a bid (in bidController.js).
   This means DOUBLE delivery jobs get created — one when admin assigns, another when customer accepts bid.
   Fix: Remove delivery job creation from assignmentController (bid acceptance handles it).

4. repairController.js line 19 — listRepairs
   BUG: If a technician has no assignments, $in: [] returns ALL repairs instead of none.
   Fix: if ids is empty return empty list immediately.

5. bidController.js line 30 — createBid
   BUG: Technician can submit bid even if they are NOT assigned to the repair.
   The route allows any LEAD/JUNIOR technician to bid on any PENDING repair, but the 
   workflow says admin must assign the technician first.
   Fix: Check AssignedTo before allowing bid creation.

6. authController.js line 14-16
   BUG: Error message says "Only CUSTOMER self-registration is allowed" but DELIVERY_MAN
   is also allowed. Misleading error that confuses delivery man registration.
   Fix: Update error message.

7. repairRoutes.js line 19
   BUG: LEAD_TECHNICIAN can assign technicians — this should be ADMIN only per the workflow.
   Fix: Remove LEAD_TECHNICIAN from assign route.

8. assignmentController.js line 29
   BUG: roleInRepair defaults to SUPPORT when not provided, but admin assigns either LEAD or JUNIOR.
   The role should be inferred from the technician's user role automatically.
   Fix: Auto-detect from technician.role instead of relying on request body.
"""

print(BUGS_FOUND)
