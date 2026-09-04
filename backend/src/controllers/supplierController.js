const supplierService = require("../services/supplierService");

const getSuppliers = async (req, res) => {
  const suppliers = supplierService.getAllSuppliers();
  res.json({ suppliers });
};

const getSupplierDetail = async (req, res) => {
  const supplier = supplierService.getSupplierById(req.params.id);
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });
  const purchases = supplierService.getSupplierPurchases(req.params.id);
  res.json({ supplier, purchases });
};

const createSupplier = async (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Supplier name is required" });
  }
  try {
    const id = supplierService.createSupplier(req.body);
    res.status(201).json({ message: "Supplier added successfully", id });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: "A party with this mobile already exists" });
    throw e;
  }
};

const updateSupplier = async (req, res) => {
  const supplier = supplierService.getSupplierById(req.params.id);
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Supplier name is required" });
  }
  supplierService.updateSupplier(req.params.id, req.body);
  res.json({ message: "Supplier updated successfully" });
};

const deleteSupplier = async (req, res) => {
  const supplier = supplierService.getSupplierById(req.params.id);
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });
  supplierService.deleteSupplier(req.params.id);
  res.json({ message: "Supplier deleted successfully" });
};

const getPurchases = async (req, res) => {
  const { status } = req.query;
  const purchases = supplierService.getAllPurchases(status);
  res.json({ purchases });
};

const getPendingPurchases = async (req, res) => {
  const purchases = supplierService.getPendingPurchases();
  res.json({ purchases });
};

const createPurchase = async (req, res) => {
  const supplier = supplierService.getSupplierById(req.params.id);
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });

  const { productName } = req.body;
  if (!productName || !String(productName).trim()) {
    return res.status(400).json({ error: "Product name is required" });
  }

  const result = supplierService.recordPurchase(req.params.id, req.body);
  res.status(201).json({
    message: "Purchase recorded and inventory updated",
    id: result.id,
    totalCost: result.totalCost,
    productId: result.productId
  });
};

const updatePurchasePayment = async (req, res) => {
  const { paymentMode, paymentDate, amount } = req.body;

  const purchase = supplierService.getPurchaseById(req.params.id);
  if (!purchase) return res.status(404).json({ error: "Purchase record not found" });

  const total = Number(purchase.total_cost) || 0;
  let amt = amount != null ? Number(amount) : total;
  if (!(amt > 0)) return res.status(400).json({ error: "Payment amount must be at least 1" });
  if (amt > total) return res.status(400).json({ error: `Payment amount cannot exceed total (${total})` });

  const finalStatus = amt >= total ? "paid" : "partial";
  const date = paymentDate || require("../../db").nowIso().slice(0, 10);

  supplierService.updatePurchasePayment(req.params.id, {
    status: finalStatus,
    paymentMode: paymentMode || "Cash",
    paymentDate: date,
    amountPaid: amt
  });

  res.json({
    message: finalStatus === "paid" ? "Supplier payment marked as paid" : "Advance/partial payment recorded",
    amount_paid: amt,
    balance: total - amt
  });
};

const deletePurchase = async (req, res) => {
  const purchase = supplierService.getPurchaseById(req.params.id);
  if (!purchase) return res.status(404).json({ error: "Purchase not found" });

  supplierService.deletePurchase(req.params.id);
  res.json({ message: "Purchase deleted successfully" });
};

module.exports = {
  getSuppliers,
  getSupplierDetail,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchases,
  getPendingPurchases,
  createPurchase,
  updatePurchasePayment,
  deletePurchase
};
