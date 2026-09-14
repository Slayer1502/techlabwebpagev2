const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { authRequired } = require("../middleware/auth");

router.get("/admin/analytics", authRequired(["admin", "sales", "auditor"]), analyticsController.getAnalytics);

module.exports = router;
