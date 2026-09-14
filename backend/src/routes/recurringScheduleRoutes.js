const express = require("express");
const router = express.Router();
const recurringScheduleController = require("../controllers/recurringScheduleController");
const { authRequired } = require("../middleware/auth");

router.get("/sales/recurring-schedules", authRequired(["admin", "sales"]), recurringScheduleController.listSchedules);
router.post("/sales/recurring-schedules", authRequired(["admin", "sales"]), recurringScheduleController.createSchedule);
router.get("/sales/recurring-schedules/due", authRequired(["admin", "sales"]), recurringScheduleController.getDue);
router.get("/sales/recurring-schedules/:id", authRequired(["admin", "sales"]), recurringScheduleController.getSchedule);
router.patch("/sales/recurring-schedules/:id", authRequired(["admin", "sales"]), recurringScheduleController.updateSchedule);
router.post("/sales/recurring-schedules/:id/complete", authRequired(["admin", "sales"]), recurringScheduleController.completeSchedule);
router.delete("/sales/recurring-schedules/:id", authRequired(["admin", "sales"]), recurringScheduleController.deleteSchedule);

module.exports = router;
