const quoteService = require("../services/quoteService");
const serviceRequestService = require("../services/serviceRequestService");
const pdfService = require("../services/pdfService");
const path = require("path");
const fs = require("fs");

const getQuotes = async (req, res) => {
  const quotes = quoteService.getQuotes(req.query.status);
  res.json({ quotes });
};

const getQuoteDetail = async (req, res) => {
  const data = quoteService.getQuoteById(req.params.id);
  if (!data) return res.status(404).json({ error: "Quote not found" });
  res.json(data);
};

const createQuote = async (req, res) => {
  try {
    const result = quoteService.createQuote(req.body);
    res.status(201).json({ message: "Supplier quote created", ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const approveQuote = async (req, res) => {
  try {
    const data = quoteService.getQuoteById(req.params.id);
    if (!data) return res.status(404).json({ error: "Quote not found" });
    if (data.quote.service_request_id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only an admin can approve service-linked supplier quotes" });
    }
    const result = quoteService.approveQuote(req.params.id, req.body);
    res.json({
      message: result.enquiryId
        ? "Quote approved — cost recorded on enquiry (PO is created on order confirmation)"
        : "Quote approved, PO created",
      ...result
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const rejectQuote = async (req, res) => {
  try {
    quoteService.rejectQuote(req.params.id);
    res.json({ message: "Quote rejected" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteQuote = async (req, res) => {
  try {
    quoteService.deleteQuote(req.params.id);
    res.json({ message: "Quote deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const uploadQuotePdf = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No PDF uploaded" });
  res.json({
    fileName: req.file.originalname || req.file.filename,
    fileUrl: `/uploads/${req.file.filename}`,
  });
};

const uploadQuotePdfToQuote = async (req, res) => {
  try {
    const data = quoteService.getQuoteById(req.params.id);
    if (!data) return res.status(404).json({ error: "Quote not found" });

    if (!req.file && !req.body.items && !req.body.noPdf) {
      return res.status(400).json({ error: "Attach a PDF or provide updated prices" });
    }

    let rawItems = req.body.items;
    let items = [];
    if (typeof rawItems === "string") {
      try { items = JSON.parse(rawItems); } catch { items = []; }
    } else if (Array.isArray(rawItems)) {
      items = rawItems;
    }

    const result = quoteService.attachQuotePdf(req.params.id, {
      pdfPath: req.file ? `/uploads/${req.file.filename}` : null,
      pdfName: req.file ? (req.file.originalname || req.file.filename) : null,
      items,
    });
    res.json({
      message: data.quote.service_request_id
        ? "Supplier quote updated" + (req.file ? " — awaiting admin approval" : "")
        : "Supplier quote updated",
      fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
      total: result.total,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const createSupplierQuoteForService = async (req, res) => {
  try {
    const { supplierId, items, notes } = req.body;
    const request = serviceRequestService.getServiceRequestById(req.params.id);
    if (!request) return res.status(404).json({ error: "Service request not found" });

    if (!supplierId) return res.status(400).json({ error: "Select a supplier to request the quote" });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Add at least one part to request" });
    }
    const cleanItems = items
      .map((it) => ({
        productName: String(it.name || "").trim(),
        quantity: Number(it.qty) || 1,
        unitCost: 0,
        brand: String(it.brand || "").trim(),
        model: String(it.model || "").trim(),
      }))
      .filter((it) => it.productName);
    if (!cleanItems.length) return res.status(400).json({ error: "Add at least one part to request" });

    const result = quoteService.createQuote({
      supplierId,
      quoteDate: new Date().toISOString().slice(0, 10),
      validUntil: null,
      notes: typeof notes === "string" && notes.trim() ? String(notes).trim() : null,
      items: cleanItems,
      enquiryId: null,
      serviceRequestId: req.params.id,
    });
    res.status(201).json({ message: "Supplier quote requested", ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const getSupplierQuotesForService = async (req, res) => {
  const quotes = quoteService.getQuotesForServiceRequest(req.params.id);
  res.json({ quotes });
};

const downloadQuotePdf = async (req, res) => {
  const data = quoteService.getQuoteById(req.params.id);
  if (!data) return res.status(404).json({ error: "Quote not found" });

  // Prefer an uploaded supplier PDF if it exists on disk.
  if (data.quote.pdf_path) {
    const uploadsDir = path.join(__dirname, "../../../uploads");
    const filePath = path.join(uploadsDir, path.basename(data.quote.pdf_path));
    if (fs.existsSync(filePath)) {
      const name = /\.pdf$/i.test(data.quote.pdf_name || "") ? data.quote.pdf_name : "supplier-quote.pdf";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${name.replace(/["\r\n]/g, "_")}"`);
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  // Otherwise generate a branded supplier-quote PDF on the fly.
  try {
    const doc = await pdfService.generateSupplierQuotePdf(req.params.id);
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="supplier-quote-${req.params.id.slice(-6)}.pdf"`);
      res.send(pdfBuffer);
    });
    doc.end();
  } catch (err) {
    console.error("Supplier Quote PDF Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate supplier quote PDF" });
  }
};

module.exports = {
  getQuotes,
  getQuoteDetail,
  createQuote,
  approveQuote,
  rejectQuote,
  deleteQuote,
  uploadQuotePdf,
  uploadQuotePdfToQuote,
  createSupplierQuoteForService,
  getSupplierQuotesForService,
  downloadQuotePdf
};
