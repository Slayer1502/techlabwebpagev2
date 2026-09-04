const express = require("express");
const router = express.Router();
const salesQuotationController = require("../controllers/salesQuotationController");
const { authRequired } = require("../middleware/auth");

router.use("/sales", authRequired(["sales", "admin"]));

router.get("/sales/quotations", salesQuotationController.getQuotations);
router.get("/sales/quotations/:id", salesQuotationController.getQuotationDetail);
router.post("/sales/quotations", salesQuotationController.createQuotation);
router.patch("/sales/quotations/:id", salesQuotationController.updateQuotation);
router.post("/sales/quotations/:id/convert", salesQuotationController.convertQuotation);
router.delete("/sales/quotations/:id", salesQuotationController.deleteQuotation);

module.exports = router;
