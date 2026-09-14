const express = require("express");
const router = express.Router();
const auditController = require("../controllers/auditController");
const { authRequired } = require("../middleware/auth");

router.get("/admin/audit-logs", authRequired(["admin"]), auditController.getAuditLogs);

module.exports = router;
