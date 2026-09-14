const pdfService = require("../services/pdfService");

const getOrderInvoice = async (req, res) => {
  try {
    const doc = await pdfService.generateOrderInvoice(req.params.id);
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="invoice-${req.params.id.slice(-6)}.pdf"`);
      res.send(pdfBuffer);
    });
    doc.end();
  } catch (err) {
    console.error("Order Invoice PDF Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate order invoice" });
  }
};

const getServiceBill = async (req, res) => {
  try {
    const doc = await pdfService.generateServiceBill(req.params.id);
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="bill-${req.params.id.slice(-6)}.pdf"`);
      res.send(pdfBuffer);
    });
    doc.end();
  } catch (err) {
    console.error("Service Bill PDF Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate service bill" });
  }
};

const getSurveyPdf = async (req, res) => {
  try {
    const doc = await pdfService.generateSurveyPdf(req.params.id);
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${req.params.id.slice(-8)}-site-visit-report.pdf"`);
      res.send(pdfBuffer);
    });
    doc.end();
  } catch (err) {
    console.error("Survey PDF Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate survey report" });
  }
};

const getChallanPdf = async (req, res) => {
  try {
    const doc = await pdfService.generateChallanPdf(req.params.id);
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="dc-${req.params.id.slice(-6)}.pdf"`);
      res.send(pdfBuffer);
    });
    doc.end();
  } catch (err) {
    console.error("Challan PDF Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate challan" });
  }
};

const getQuotationPdf = async (req, res) => {
  try {
    const doc = await pdfService.generateQuotationPdf(req.params.id);
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="quotation-${req.params.id.slice(-6)}.pdf"`);
      res.send(pdfBuffer);
    });
    doc.end();
  } catch (err) {
    console.error("Quotation PDF Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate quotation" });
  }
};

const getCompanyProfilePdf = async (req, res) => {
  try {
    const doc = await pdfService.generateCompanyProfilePdf();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=company-profile.pdf");
    doc.pipe(res);
    doc.end();
  } catch (err) {
    console.error("Company Profile PDF Error:", err);
    res.status(500).json({ error: "Failed to generate company profile" });
  }
};

module.exports = {
  getOrderInvoice,
  getServiceBill,
  getSurveyPdf,
  getChallanPdf,
  getQuotationPdf,
  getCompanyProfilePdf
};
