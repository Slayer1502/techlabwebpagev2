const purchaseOrderService = require("../services/purchaseOrderService");

const getPurchaseOrders = async (req, res) => {
  const purchaseOrders = purchaseOrderService.getPurchaseOrders();
  res.json({ purchaseOrders });
};

const getPurchaseOrderDetail = async (req, res) => {
  const data = purchaseOrderService.getPurchaseOrderById(req.params.id);
  if (!data) return res.status(404).json({ error: "Purchase order not found" });
  res.json(data);
};

const createPurchaseOrder = async (req, res) => {
  try {
    const result = purchaseOrderService.createPurchaseOrder(req.body);
    res.status(201).json({ message: "Purchase order created", ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const receivePurchaseOrder = async (req, res) => {
  try {
    const result = purchaseOrderService.receivePurchaseOrder(req.params.id, req.body);
    res.json({ message: "PO received, stock updated", ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const deletePurchaseOrder = async (req, res) => {
  try {
    const force = req.query.force === "true";
    purchaseOrderService.deletePurchaseOrder(req.params.id, force);
    res.json({ message: "Purchase order deleted successfully" });
  } catch (err) {
    if (err.requiresForce) {
      return res.status(400).json({
        error: err.message,
        requiresForce: true,
        linkedPurchases: err.linkedPurchases
      });
    }
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderDetail,
  createPurchaseOrder,
  receivePurchaseOrder,
  deletePurchaseOrder
};
