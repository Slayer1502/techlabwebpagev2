const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../controllers/purchaseOrderController");
const { authRequired } = require("../middleware/auth");

router.get("/sales/purchase-orders", authRequired(["sales", "admin"]), purchaseOrderController.getPurchaseOrders);
router.get("/sales/purchase-orders/:id", authRequired(["sales", "admin"]), purchaseOrderController.getPurchaseOrderDetail);
router.post("/sales/purchase-orders", authRequired(["sales", "admin"]), purchaseOrderController.createPurchaseOrder);
router.post("/sales/purchase-orders/:id/receive", authRequired(["sales", "admin"]), purchaseOrderController.receivePurchaseOrder);
router.patch("/sales/purchase-orders/:id/payment", authRequired(["sales", "admin"]), purchaseOrderController.recordPurchaseOrderPayment);
router.delete("/sales/purchase-orders/:id", authRequired(["sales", "admin"]), purchaseOrderController.deletePurchaseOrder);

module.exports = router;
