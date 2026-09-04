const orderService = require("../services/orderService");
const { parsePagination } = require("../utils/helpers");

const getOrders = async (req, res) => {
  const { limit, offset, page } = parsePagination(req.query, 100);
  const orders = orderService.getOrders(limit, offset);
  res.json({ orders });
};

const getNewOrdersCount = async (req, res) => {
    const count = orderService.getNewOrdersCount();
    res.json({ count });
};

const getOrderItems = async (req, res) => {
    const items = orderService.getOrderItems(req.params.id);
    res.json({ items });
};

const createOrder = async (req, res) => {
  const { customerName, customer_mobile: mobile, address, items, isGstBill, paymentStatus, paymentMode, paymentDate, created_at: createdAt, skipStockDeduction, status } = req.body;

  if (!customerName || !mobile || !items) {
    return res.status(400).json({ error: "Missing required fields for order" });
  }

  const result = orderService.createOrderForCustomer({
    customerName,
    mobile,
    address,
    items,
    isGstBill: Number(isGstBill),
    paymentStatus,
    paymentMode,
    paymentDate,
    createdAt,
    skipStockDeduction,
    status
  });

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  res.status(201).json({ message: "Order placed successfully", orderId: result.orderId, totalAmount: result.totalAmount });
};

const getOrderDetail = async (req, res) => {
  const order = orderService.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({ order });
};

const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  orderService.updateOrderStatus(req.params.id, status);
  res.json({ message: "Order status updated" });
};

const deleteOrder = async (req, res) => {
  const { revertToDc } = req.query;
  try {
      orderService.deleteOrder(req.params.id, revertToDc === 'true');
      res.json({ message: "Order deleted successfully" + (revertToDc === 'true' ? " and DCs reverted" : "") });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
};

const recordPayment = async (req, res) => {
    const { amount, paymentMode, paidAt } = req.body;
    const result = orderService.recordOrderPayment(req.params.id, { amount, paymentMode, paidAt });
    if (result.error) return res.status(404).json({ error: result.error });
    res.json({ message: "Order payment recorded", ...result });
};

module.exports = {
  getOrders,
  getNewOrdersCount,
  getOrderItems,
  createOrder,
  getOrderDetail,
  updateOrderStatus,
  deleteOrder,
  recordPayment
};
