const express = require("express");
const router = express.Router();
const salesQuotationController = require("../controllers/salesQuotationController");
const { authRequired } = require("../middleware/auth");

router.get("/sales/quotations", authRequired(["sales", "admin"]), salesQuotationController.getQuotations);
router.get("/sales/quotations/:id", authRequired(["sales", "admin"]), salesQuotationController.getQuotationDetail);
router.post("/sales/quotations", authRequired(["sales", "admin"]), salesQuotationController.createQuotation);
router.patch("/sales/quotations/:id", authRequired(["sales", "admin"]), salesQuotationController.updateQuotation);
router.post("/sales/quotations/:id/convert", authRequired(["sales", "admin"]), salesQuotationController.convertQuotation);
router.delete("/sales/quotations/:id", authRequired(["sales", "admin"]), salesQuotationController.deleteQuotation);

module.exports = router;
