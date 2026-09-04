const salesQuotationService = require("../services/salesQuotationService");
const userService = require("../services/userService");

const getQuotations = async (req, res) => {
  const quotations = salesQuotationService.getQuotations(req.query.status);
  res.json({ quotations });
};

const getQuotationDetail = async (req, res) => {
  const data = salesQuotationService.getQuotationById(req.params.id);
  if (!data) return res.status(404).json({ error: "Quotation not found" });
  res.json(data);
};

const createQuotation = async (req, res) => {
  const { customerName, items } = req.body;
  if (!customerName || !String(customerName).trim()) return res.status(400).json({ error: "Customer name is required" });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Add at least one item to the quotation" });

  const actor = userService.getUserById(req.user.id);
  const result = salesQuotationService.createQuotation(req.body, actor ? actor.name : null);
  res.status(201).json({ message: "Quotation created", ...result });
};

const updateQuotation = async (req, res) => {
  const { customerName, items } = req.body;
  if (!customerName || !String(customerName).trim()) return res.status(400).json({ error: "Customer name is required" });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Add at least one item to the quotation" });

  try {
    salesQuotationService.updateQuotation(req.params.id, req.body);
    res.json({ message: "Quotation updated" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const convertQuotation = async (req, res) => {
  try {
    salesQuotationService.convertQuotation(req.params.id);
    res.json({ message: "Quotation marked as converted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deleteQuotation = async (req, res) => {
  try {
    salesQuotationService.deleteQuotation(req.params.id);
    res.json({ message: "Quotation deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  getQuotations,
  getQuotationDetail,
  createQuotation,
  updateQuotation,
  convertQuotation,
  deleteQuotation
};
