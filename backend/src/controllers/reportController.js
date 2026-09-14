const reportService = require("../services/reportService");
const userService = require("../services/userService");

const canViewAdminReports = (role) => role === "admin" || role === "auditor";

const { db } = require("../../db");

const resolveLedgerPartyOrError = (partyQuery) => {
  if (!String(partyQuery || "").trim()) {
    return { status: 400, error: "Please select a customer or supplier for the Party Ledger." };
  }
  const party = reportService.resolveLedgerParty(partyQuery);
  if (!party) {
    return { status: 404, error: "Selected party was not found. Please pick one from the list." };
  }
  return { party };
};

const getReportsMeta = async (req, res) => {
  const isAdmin = canViewAdminReports(req.user.role);
  const groups = reportService.REPORT_GROUPS.map(g => ({ ...g }));
  const reports = reportService.REPORTS
    .filter(r => isAdmin || !r.adminOnly)
    .map(({ adminOnly, ...rest }) => rest);
  return res.json({ groups, reports });
};

const getReport = async (req, res) => {
  let format = "pdf";
  try {
    const scope = String(req.query.scope || "").trim();
    const pathFormat = String(req.path || "").includes('.xlsx') ? 'xlsx' : 'pdf';
    format = String(req.query.format || pathFormat).toLowerCase();
    const meta = reportService.resolveReportMeta(scope);

    if (!meta) return res.status(400).json({ error: "Unsupported report scope" });
    if (format !== "pdf" && format !== "xlsx") {
      return res.status(400).json({ error: "Unsupported format. Use pdf or xlsx." });
    }
    if (!canViewAdminReports(req.user.role) && meta.adminOnly) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    if (scope === "customer_ledger") {
      const ledger = resolveLedgerPartyOrError(req.query.party);
      if (ledger.error) return res.status(ledger.status).json({ error: ledger.error });
    }

    const report = reportService.buildReport(scope, { start: req.query.start, end: req.query.end, party: req.query.party });
    if (!report) return res.status(400).json({ error: "Unsupported report scope" });

    const filename = `${report.filenameBase}.${format === "pdf" ? "pdf" : "xlsx"}`;
    const subdir = `${scope}/${req.query.start || 'all'}-${req.query.end || 'all'}`;

    const result = format === "pdf"
      ? await reportService.createPdfReport(
          filename,
          report.title,
          report.summaryItems,
          report.tableHeaders,
          report.tableRows,
          subdir,
          report.sections
        )
      : await reportService.createXlsxReport(
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
        format,
        start: String(req.query.start || "").slice(0, 10),
        end: String(req.query.end || "").slice(0, 10),
        file_path: result.savedRel,
        filesize: result.filesize,
        generated_by: req.user.id,
        generated_by_name: actor ? actor.name : "System"
    });

    res.setHeader("Content-Type", format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.send(format === "pdf" ? result.pdfBuffer : result.xlsxBuffer);
  } catch (err) {
    console.error("Report Generation Error:", err.stack);
    res.status(500).json({ error: "Failed to generate " + (format === "xlsx" ? "Excel" : "PDF") + ": " + err.message });
  }
};

const getPdfReport = getReport;

const getReportData = async (req, res) => {
  try {
    const scope = String(req.query.scope || "").trim();
    const meta = reportService.resolveReportMeta(scope);

    if (!meta) return res.status(400).json({ error: "Unsupported report scope" });
    if (!canViewAdminReports(req.user.role) && meta.adminOnly) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    if (scope === "customer_ledger") {
      const ledger = resolveLedgerPartyOrError(req.query.party);
      if (ledger.error) return res.status(ledger.status).json({ error: ledger.error });
    }

    const report = reportService.buildReport(scope, { start: req.query.start, end: req.query.end, party: req.query.party });
    if (!report) return res.status(400).json({ error: "Unsupported report scope" });

    return res.json({
      meta: { id: scope, title: report.title, group: meta.group, dated: meta.dated, adminOnly: meta.adminOnly },
      summaryItems: report.summaryItems || [],
      tableHeaders: report.tableHeaders || null,
      tableRows: report.tableRows || [],
      sections: report.sections || null
    });
  } catch (err) {
    console.error("Report Data Error:", err.stack);
    res.status(500).json({ error: "Failed to load report data" });
  }
};

const getArchive = async (req, res) => {
    const isAdmin = canViewAdminReports(req.user.role);
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
    const row = db.prepare("SELECT * FROM report_archive WHERE id = ?").get(id);
    if (!row) return res.status(404).json({ error: "Archive record not found" });

    const fs = require("fs");
    const path = require("path");
    const reportsDir = path.join(__dirname, "../../../reports");
    const full = path.join(reportsDir, row.file_path);
    if (!fs.existsSync(full)) return res.status(404).json({ error: "Physical file not found on disk" });

    const contentTypeMap = {
      pdf: "application/pdf",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      csv: "text/csv"
    };
    res.setHeader("Content-Type", contentTypeMap[row.format] || "application/octet-stream");
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

const getReportParties = async (req, res) => {
    const rows = db.prepare("SELECT id, name, mobile, is_customer, is_supplier FROM parties ORDER BY name").all();
    res.json({ parties: rows });
};

module.exports = {
    getReportsMeta,
    getPdfReport,
    getReport,
    getReportData,
    getArchive,
    downloadArchivedReport,
    batchDeleteArchive,
    getDayEndReport,
    getReportParties
};
