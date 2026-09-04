const quoteService = require("../services/quoteService");
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
    const result = quoteService.approveQuote(req.params.id, req.body);
    res.json({ message: "Quote approved, PO created", ...result });
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

const downloadQuotePdf = async (req, res) => {
  const data = quoteService.getQuoteById(req.params.id);
  if (!data || !data.quote.pdf_path) return res.status(404).json({ error: "PDF not found for this quote" });

  const uploadsDir = path.join(__dirname, "../../../uploads");
  const filePath = path.join(uploadsDir, path.basename(data.quote.pdf_path));

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "PDF file not found on server" });

  const name = /\.pdf$/i.test(data.quote.pdf_name || "") ? data.quote.pdf_name : "supplier-quote.pdf";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${name.replace(/["\r\n]/g, "_")}"`);
  fs.createReadStream(filePath).pipe(res);
};

module.exports = {
  getQuotes,
  getQuoteDetail,
  createQuote,
  approveQuote,
  rejectQuote,
  deleteQuote,
  uploadQuotePdf,
  downloadQuotePdf
};
