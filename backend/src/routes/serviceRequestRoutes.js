const express = require("express");
const router = express.Router();
const serviceRequestController = require("../controllers/serviceRequestController");
const { authRequired } = require("../middleware/auth");

// Public
router.post("/public/service-requests", serviceRequestController.createPublicRequest);

// Sales
router.post("/sales/service-requests", authRequired(["sales"]), serviceRequestController.createSalesRequest);
router.get("/sales/service-requests/list", authRequired(["sales", "admin"]), serviceRequestController.listRequestsForLinking);
router.get("/sales/service-requests/:id", authRequired(["sales", "admin"]), serviceRequestController.getRequestById);
router.get("/sales/service-requests/:id/quotations", authRequired(["sales", "admin"]), serviceRequestController.getQuotationStatus);
router.patch("/sales/service-requests/:id/assign", authRequired(["sales"]), serviceRequestController.assignTechnician);
router.patch("/sales/service-requests/:id/notes", authRequired(["sales", "admin", "technician"]), serviceRequestController.updateStatusNotes);
router.post("/sales/service-requests/:id/bill", authRequired(["sales", "admin"]), serviceRequestController.generateBill);
router.patch("/sales/service-requests/:id/payment", authRequired(["sales", "admin"]), serviceRequestController.recordPayment);
router.get("/sales/service-requests/:id/payments", authRequired(["sales", "admin"]), serviceRequestController.getPayments);
router.patch("/sales/service-requests/:id/cancel", authRequired(["sales", "admin"]), serviceRequestController.cancelServiceRequest);

// Technician
router.patch("/technician/service-requests/:id/parts", authRequired(["technician", "admin"]), serviceRequestController.requestParts);
router.patch("/technician/service-requests/:id/part-collected", authRequired(["technician", "admin"]), serviceRequestController.markPartsCollected);
router.patch("/technician/service-requests/:id/job-progress", authRequired(["technician", "admin"]), serviceRequestController.updateJobProgress);
router.post("/technician/service-requests/:id/complete", authRequired(["technician", "admin"]), serviceRequestController.jobComplete);
router.post("/technician/service-requests/:id/challan-return", authRequired(["technician", "admin"]), serviceRequestController.recordChallanReturn);

// Sales (parts)
router.patch("/sales/service-requests/:id/part-ready", authRequired(["sales", "admin"]), serviceRequestController.markPartsAvailable);

// Customer
router.post("/customer/service-requests", authRequired(["customer"]), serviceRequestController.createCustomerRequest);

module.exports = router;
