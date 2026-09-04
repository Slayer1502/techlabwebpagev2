const exportService = require("../services/exportService");

const getOrdersExport = async (req, res) => {
  const orders = exportService.exportOrders();
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=orders.json");
  res.json(orders);
};

const getRequestsExport = async (req, res) => {
  const requests = exportService.exportRequests();
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=requests.json");
  res.json(requests);
};

const getProductsExport = async (req, res) => {
  const products = exportService.exportProducts();
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=products.json");
  res.json(products);
};

module.exports = {
  getOrdersExport,
  getRequestsExport,
  getProductsExport
};
