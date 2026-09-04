const enquiryService = require("../services/enquiryService");
const { nowIso } = require("../../db");

const getEnquiries = async (req, res) => {
  const { status } = req.query;
  const enquiries = enquiryService.getEnquiries(status);
  res.json({ enquiries });
};

const createEnquiry = async (req, res) => {
  const { customerName, mobile, type } = req.body;
  if (!customerName || !mobile || !type) {
    return res.status(400).json({ error: "Customer name, mobile and enquiry type are required" });
  }

  const id = enquiryService.createEnquiryRecord(req.body);
  res.json({ message: "Enquiry recorded", id });
};

const updateEnquiry = async (req, res) => {
  const enquiry = enquiryService.getEnquiryById(req.params.id);
  if (!enquiry) return res.status(404).json({ error: "Enquiry not found" });

  const { status, quoteOptions, supplierId, quotedPrice } = req.body;
  const allowedStatuses = ["new", "quoted", "confirmed", "ordered", "delivered"];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  // Handle 'quoted' logic separately as in original
  if (status === "quoted") {
    if (enquiry.status !== "new") return res.status(400).json({ error: "Only new enquiries can be quoted" });
    if (!quoteOptions || !Array.isArray(quoteOptions) || !quoteOptions.length) {
      if (!supplierId) return res.status(400).json({ error: "Select a supplier" });
      if (!(Number(quotedPrice) > 0)) return res.status(400).json({ error: "Enter a valid quoted price" });
    }
  }

  const { db } = require("../../db");
  const actor = db.prepare("SELECT name FROM users WHERE id = ?").get(req.user.id);
  const actorName = actor ? actor.name : req.user.id;
  const updatedBy = actorName ? `${actorName} at ${nowIso().slice(0, 16)}` : null;

  if (status === "quoted") {
    enquiryService.quoteEnquiry(req.params.id, req.body, updatedBy);
    return res.json({ message: "Customer quoted" });
  }

  enquiryService.updateEnquiry(req.params.id, req.body, updatedBy);
  res.json({ message: "Enquiry updated" });
};

const confirmEnquiry = async (req, res) => {
  const enquiry = enquiryService.getEnquiryById(req.params.id);
  if (!enquiry) return res.status(404).json({ error: "Enquiry not found" });
  if (enquiry.status !== "quoted") return res.status(400).json({ error: "Only quoted enquiries can be confirmed" });

  const { db } = require("../../db");
  const actor = db.prepare("SELECT name FROM users WHERE id = ?").get(req.user.id);
  const actorName = actor ? actor.name : req.user.id;
  const updatedBy = actorName ? `${actorName} at ${nowIso().slice(0, 16)}` : null;

  const advanceData = {
    customerAdvanceAmount: Number(req.body.customerAdvanceAmount) || 0,
    customerAdvanceMode: req.body.customerAdvanceMode || "Cash",
    customerAdvanceDate: req.body.customerAdvanceDate || nowIso().slice(0, 10),
    supplierAdvanceAmount: Number(req.body.supplierAdvanceAmount) || 0,
    supplierAdvanceMode: req.body.supplierAdvanceMode || "Cash",
    supplierAdvanceDate: req.body.supplierAdvanceDate || nowIso().slice(0, 10)
  };

  const result = enquiryService.confirmEnquiry(req.params.id, advanceData, updatedBy);
  if (result.error) return res.status(400).json({ error: result.error });

  res.json({ message: "Enquiry confirmed, PO created", poId: result.poId, poNumber: result.poNumber });
};

const deliverEnquiry = async (req, res) => {
  const enquiry = enquiryService.getEnquiryById(req.params.id);
  if (!enquiry) return res.status(404).json({ error: "Enquiry not found" });
  if (!["confirmed", "ordered"].includes(enquiry.status)) return res.status(400).json({ error: "Only confirmed/ordered enquiries can be marked delivered" });

  const { db } = require("../../db");
  const actor = db.prepare("SELECT name FROM users WHERE id = ?").get(req.user.id);
  const actorName = actor ? actor.name : req.user.id;
  const updatedBy = actorName ? `${actorName} at ${nowIso().slice(0, 16)}` : null;

  const paymentData = {
    received: Number(req.body.received) || 0,
    mode: req.body.mode || "Cash",
    date: req.body.date || nowIso().slice(0, 10)
  };

  enquiryService.deliverEnquiry(req.params.id, paymentData, updatedBy);
  res.json({ message: "Enquiry marked delivered and payment recorded" });
};

const deleteEnquiry = async (req, res) => {
  const enquiry = enquiryService.getEnquiryById(req.params.id);
  if (!enquiry) return res.status(404).json({ error: "Enquiry not found" });
  enquiryService.deleteEnquiry(req.params.id);
  res.json({ message: "Enquiry deleted" });
};

module.exports = {
  getEnquiries,
  createEnquiry,
  updateEnquiry,
  confirmEnquiry,
  deliverEnquiry,
  deleteEnquiry
};
