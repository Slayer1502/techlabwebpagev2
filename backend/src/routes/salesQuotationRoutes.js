const express = require("express");
const router = express.Router();
const salesQuotationController = require("../controllers/salesQuotationController");
const { authRequired } = require("../middleware/auth");

router.get("/sales/quotations", authRequired(["sales", "admin"]), salesQuotationController.getQuotations);
router.get("/sales/quotations/:id", authRequired(["sales", "admin"]), salesQuotationController.getQuotationDetail);
router.get("/sales/quotations/:id/excel", authRequired(["sales", "admin"]), salesQuotationController.exportQuotationExcel);
router.post("/sales/quotations", authRequired(["sales", "admin"]), salesQuotationController.createQuotation);
router.patch("/sales/quotations/:id", authRequired(["sales", "admin"]), salesQuotationController.updateQuotation);
router.post("/sales/quotations/:id/convert", authRequired(["sales", "admin"]), salesQuotationController.convertQuotation);
router.delete("/sales/quotations/:id", authRequired(["sales", "admin"]), salesQuotationController.deleteQuotation);
router.post("/sales/quotations/:id/duplicate", authRequired(["sales", "admin"]), salesQuotationController.duplicateQuotation);

module.exports = router;
