const express = require("express");
const router = express.Router();
const purchaseOrderController = require("../controllers/purchaseOrderController");
const { authRequired } = require("../middleware/auth");

router.use("/sales", authRequired(["sales", "admin"]));

router.get("/sales/purchase-orders", purchaseOrderController.getPurchaseOrders);
router.get("/sales/purchase-orders/:id", purchaseOrderController.getPurchaseOrderDetail);
router.post("/sales/purchase-orders", purchaseOrderController.createPurchaseOrder);
router.post("/sales/purchase-orders/:id/receive", purchaseOrderController.receivePurchaseOrder);
router.delete("/sales/purchase-orders/:id", purchaseOrderController.deletePurchaseOrder);

module.exports = router;
