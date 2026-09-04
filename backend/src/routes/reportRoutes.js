const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { authRequired } = require("../middleware/auth");

router.get("/admin/reports/meta", authRequired(["admin", "sales"]), reportController.getReportsMeta);
router.get("/admin/reports.pdf", authRequired(["admin", "sales"]), reportController.getPdfReport);
router.get("/admin/reports/archive", authRequired(["admin", "sales"]), reportController.getArchive);
router.get("/sales/reports/day-end", authRequired(["admin", "sales"]), reportController.getDayEndReport);
router.get("/admin/reports/archive/:id/download", authRequired(["admin", "sales"]), reportController.downloadArchivedReport);
router.post("/admin/reports/archive/batch-delete", authRequired(["admin"]), reportController.batchDeleteArchive);

module.exports = router;
