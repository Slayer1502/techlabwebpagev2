const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authRequired } = require("../middleware/auth");

router.get("/sales/orders", authRequired(["sales", "admin", "auditor"]), orderController.getOrders);
router.get("/sales/orders/new-count", authRequired(["sales", "admin", "auditor"]), orderController.getNewOrdersCount);
router.get("/sales/orders/:id/items", authRequired(["sales", "admin", "auditor"]), orderController.getOrderItems);
router.post("/sales/orders", authRequired(["sales", "admin"]), orderController.createOrder);
router.get("/sales/orders/:id", authRequired(["sales", "admin", "auditor"]), orderController.getOrderDetail);
router.get("/sales/orders/:id/payments", authRequired(["sales", "admin", "auditor"]), orderController.getOrderDetail);
router.patch("/sales/orders/:id/status", authRequired(["sales", "admin"]), orderController.updateOrderStatus);
router.delete("/sales/orders/:id", authRequired(["sales", "admin"]), orderController.deleteOrder);
router.patch("/sales/orders/:id/payment", authRequired(["sales", "admin"]), orderController.recordPayment);

module.exports = router;
