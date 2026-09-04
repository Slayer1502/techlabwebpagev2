const reportService = require("../services/reportService");
const userService = require("../services/userService");

const getReportsMeta = async (req, res) => {
  const isAdmin = req.user.role === "admin";
  const groups = reportService.REPORT_GROUPS.map(g => ({ ...g }));
  const reports = reportService.REPORTS
    .filter(r => isAdmin || !r.adminOnly)
    .map(({ adminOnly, ...rest }) => rest);
  return res.json({ groups, reports });
};

const getPdfReport = async (req, res) => {
  try {
    const scope = String(req.query.scope || "").trim();
    const meta = reportService.resolveReportMeta(scope);

    if (!meta) return res.status(400).json({ error: "Unsupported report scope" });
    if (req.user.role !== "admin" && meta.adminOnly) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const report = reportService.buildReport(scope, { start: req.query.start, end: req.query.end });
    if (!report) return res.status(400).json({ error: "Unsupported report scope" });

    const filename = `${report.filenameBase}.pdf`;
    const subdir = `${scope}/${req.query.start || 'all'}-${req.query.end || 'all'}`;

    const result = await reportService.createPdfReport(
        filename,
        report.title,
        report.summaryItems,
        report.tableHeaders,
        report.tableRows,
        subdir,
        report.sections
    );

    const actor = userService.getUserById(req.user.id);
    reportService.archiveReportRecord({
        scope,
        format: "pdf",
        start: String(req.query.start || "").slice(0, 10),
        end: String(req.query.end || "").slice(0, 10),
        file_path: result.savedRel,
        filesize: result.filesize,
        generated_by: req.user.id,
        generated_by_name: actor ? actor.name : "System"
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.send(result.pdfBuffer);
  } catch (err) {
    console.error("PDF Generation Error:", err.stack);
    res.status(500).json({ error: "Failed to generate PDF: " + err.message });
  }
};

const getArchive = async (req, res) => {
    const isAdmin = req.user.role === "admin";
    const rows = reportService.getArchivedReports();
    const files = rows
        .filter(r => isAdmin || !(reportService.resolveReportMeta(r.scope) && reportService.resolveReportMeta(r.scope).adminOnly))
        .map(r => {
            const meta = reportService.resolveReportMeta(r.scope);
            return {
                id: r.id,
                scope: r.scope,
                title: r.title || (meta ? meta.title : r.scope),
                format: r.format,
                range: r.range_label || "All records",
                url: `/api/admin/reports/archive/${r.id}/download`,
                size: r.filesize,
                generated_by: r.generated_by_name || "System",
                created_at: r.created_at
            };
        });
    res.json({ files });
};

const downloadArchivedReport = async (req, res) => {
    const { id } = req.params;
    const { db } = require("../../db");
    const row = db.prepare("SELECT * FROM report_archive WHERE id = ?").get(id);
    if (!row) return res.status(404).json({ error: "Archive record not found" });

    const fs = require("fs");
    const path = require("path");
    const reportsDir = path.join(__dirname, "../../../reports");
    const full = path.join(reportsDir, row.file_path);
    if (!fs.existsSync(full)) return res.status(404).json({ error: "Physical file not found on disk" });

    res.setHeader("Content-Type", row.format === "pdf" ? "application/pdf" : "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(row.file_path)}"`);
    fs.createReadStream(full).pipe(res);
};

const batchDeleteArchive = async (req, res) => {
    const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids.map(String) : [];
    if (!ids.length) return res.status(400).json({ error: "No ids provided" });

    for (const id of ids) {
        reportService.deleteArchivedReport(id);
    }
    res.json({ message: "Selected reports deleted" });
};

const getDayEndReport = async (req, res) => {
    const date = req.query.date || require("../../db").nowIso().slice(0, 10);
    try {
        const data = reportService.getDayEndReportData(date);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getReportsMeta,
    getPdfReport,
    getArchive,
    downloadArchivedReport,
    batchDeleteArchive,
    getDayEndReport
};
