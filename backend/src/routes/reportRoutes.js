const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { authRequired } = require("../middleware/auth");

router.get("/admin/reports/meta", authRequired(["admin", "sales", "auditor"]), reportController.getReportsMeta);
router.get("/admin/reports/parties", authRequired(["admin", "sales", "auditor"]), reportController.getReportParties);
router.get("/admin/reports/data", authRequired(["admin", "sales", "auditor"]), reportController.getReportData);
router.get("/admin/reports.pdf", authRequired(["admin", "sales", "auditor"]), reportController.getPdfReport);
router.get("/admin/reports.xlsx", authRequired(["admin", "sales", "auditor"]), reportController.getReport);
router.get("/admin/reports/archive", authRequired(["admin", "sales", "auditor"]), reportController.getArchive);
router.get("/sales/reports/day-end", authRequired(["admin", "sales", "auditor"]), reportController.getDayEndReport);
router.get("/admin/reports/archive/:id/download", authRequired(["admin", "sales", "auditor"]), reportController.downloadArchivedReport);
router.post("/admin/reports/archive/batch-delete", authRequired(["admin"]), reportController.batchDeleteArchive);

module.exports = router;
