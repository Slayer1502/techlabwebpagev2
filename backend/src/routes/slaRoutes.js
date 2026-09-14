const express = require("express");
const router = express.Router();
const slaController = require("../controllers/slaController");
const { authRequired } = require("../middleware/auth");

router.get("/admin/sla-status", authRequired(["admin", "sales", "auditor"]), slaController.getSlaStatus);
router.get("/admin/sla-definitions", authRequired(["admin"]), slaController.getSlaDefinitions);
router.post("/admin/sla-definitions", authRequired(["admin"]), slaController.upsertSlaDefinition);
router.put("/admin/sla-definitions/:id", authRequired(["admin"]), slaController.upsertSlaDefinition);

module.exports = router;
