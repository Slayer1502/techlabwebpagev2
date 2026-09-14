const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authRequired } = require("../middleware/auth");

router.get("/admin/staff", authRequired(["admin", "sales"]), adminController.getStaff);
router.post("/admin/employees", authRequired(["admin"]), adminController.createStaff);
router.delete("/admin/staff/:id", authRequired(["admin"]), adminController.deleteStaff);
router.patch("/admin/staff/:id/reset-password", authRequired(["admin"]), adminController.resetStaffPassword);
router.get("/admin/technicians", authRequired(["admin", "sales", "employee"]), adminController.getTechnicians);

module.exports = router;
