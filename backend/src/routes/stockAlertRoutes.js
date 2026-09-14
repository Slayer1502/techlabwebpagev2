const express = require("express");
const router = express.Router();
const stockAlertController = require("../controllers/stockAlertController");
const { authRequired } = require("../middleware/auth");

router.get("/admin/stock-alerts", authRequired(["admin", "sales"]), stockAlertController.getAlerts);
router.post("/admin/stock-alerts/scan", authRequired(["admin", "sales"]), stockAlertController.scanAlerts);
router.patch("/admin/stock-alerts/:id/dismiss", authRequired(["admin", "sales"]), stockAlertController.dismissAlert);

module.exports = router;
