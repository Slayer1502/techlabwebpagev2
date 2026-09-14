const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authRequired } = require("../middleware/auth");

router.get("/admin/dashboard", authRequired(["admin", "auditor", "sales"]), dashboardController.getAdminDashboard);
router.get("/sales/dashboard", authRequired(["sales", "admin"]), dashboardController.getSalesDashboard);
router.get("/sales/dashboard/details", authRequired(["sales", "admin"]), dashboardController.getSalesDashboardDetails);
router.get("/employee/dashboard", authRequired(["employee"]), dashboardController.getEmployeeDashboard);
router.get("/technician/dashboard", authRequired(["technician"]), dashboardController.getTechnicianDashboard);
router.get("/customer/dashboard", authRequired(["customer"]), dashboardController.getCustomerDashboard);

module.exports = router;
