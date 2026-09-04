const express = require("express");
const router = express.Router();
const pdfController = require("../controllers/pdfController");
const emailController = require("../controllers/emailController");
const { authRequired } = require("../middleware/auth");

router.get("/sales/orders/:id/invoice.pdf", authRequired(["sales", "admin"]), pdfController.getOrderInvoice);
router.post("/sales/orders/:id/email-invoice", authRequired(["sales", "admin"]), emailController.sendOrderInvoiceEmail);

router.get("/sales/service-requests/:id/bill.pdf", authRequired(["sales", "admin"]), pdfController.getServiceBill);
router.post("/sales/service-requests/:id/email-bill", authRequired(["sales", "admin"]), emailController.sendServiceBillEmail);

router.get("/sales/service-requests/:id/survey.pdf", authRequired(["sales", "admin"]), pdfController.getSurveyPdf);
router.get("/sales/challans/:id.pdf", authRequired(["sales", "admin"]), pdfController.getChallanPdf);
router.get("/admin/company-profile.pdf", authRequired(["admin"]), pdfController.getCompanyProfilePdf);

module.exports = router;
