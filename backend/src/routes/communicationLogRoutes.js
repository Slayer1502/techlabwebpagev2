const express = require("express");
const router = express.Router();
const communicationLogController = require("../controllers/communicationLogController");
const { authRequired } = require("../middleware/auth");

router.post("/admin/communications", authRequired(["admin", "sales", "employee"]), communicationLogController.createLog);
router.get("/admin/communications/:entityType/:entityId", authRequired(["admin", "sales", "employee"]), communicationLogController.listForEntity);
router.delete("/admin/communications/:id", authRequired(["admin", "sales"]), communicationLogController.removeCommunication);

module.exports = router;
