const express = require("express");
const router = express.Router();
const splitPaymentController = require("../controllers/splitPaymentController");
const { authRequired } = require("../middleware/auth");

router.post("/sales/service-requests/:id/split-payment", authRequired(["sales", "admin"]), splitPaymentController.splitPaymentForService);
router.post("/sales/orders/:id/split-payment", authRequired(["sales", "admin"]), splitPaymentController.splitPaymentForOrder);

module.exports = router;
