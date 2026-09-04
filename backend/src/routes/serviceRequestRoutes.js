const express = require("express");
const router = express.Router();
const serviceRequestController = require("../controllers/serviceRequestController");
const { authRequired } = require("../middleware/auth");

// Public
router.post("/public/service-requests", serviceRequestController.createPublicRequest);

// Sales
router.post("/sales/service-requests", authRequired(["sales"]), serviceRequestController.createSalesRequest);
router.get("/sales/service-requests/:id", authRequired(["sales", "admin"]), serviceRequestController.getRequestById);
router.patch("/sales/service-requests/:id/assign", authRequired(["sales"]), serviceRequestController.assignTechnician);
router.patch("/sales/service-requests/:id/notes", authRequired(["sales", "admin", "technician"]), serviceRequestController.updateStatusNotes);
router.post("/sales/service-requests/:id/bill", authRequired(["sales", "admin"]), serviceRequestController.generateBill);
router.patch("/sales/service-requests/:id/payment", authRequired(["sales", "admin"]), serviceRequestController.recordPayment);
router.get("/sales/service-requests/:id/payments", authRequired(["sales", "admin"]), serviceRequestController.getPayments);

// Customer
router.post("/customer/service-requests", authRequired(["customer"]), serviceRequestController.createCustomerRequest);

module.exports = router;
