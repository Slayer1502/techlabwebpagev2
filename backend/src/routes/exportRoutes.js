const express = require("express");
const router = express.Router();
const exportController = require("../controllers/exportController");
const { authRequired } = require("../middleware/auth");

router.get("/export/orders.json", authRequired(["sales", "admin"]), exportController.getOrdersExport);
router.get("/export/requests.json", authRequired(["sales", "admin", "technician"]), exportController.getRequestsExport);
router.get("/export/products.json", authRequired(["admin", "employee"]), exportController.getProductsExport);

module.exports = router;
