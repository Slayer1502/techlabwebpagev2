const dashboardService = require("../services/dashboardService");
const { parsePagination } = require("../utils/helpers");

const getAdminDashboard = async (req, res) => {
  const { limit, offset } = parsePagination(req.query);
  const data = dashboardService.getAdminDashboardData(limit, offset);
  res.json(data);
};

const getSalesDashboard = async (req, res) => {
  const data = dashboardService.getSalesDashboardData(req.query);
  res.json(data);
};

const getSalesDashboardDetails = async (req, res) => {
  const data = dashboardService.getSalesDashboardDetails(req.query.type);
  res.json(data);
};

const getEmployeeDashboard = async (req, res) => {
  const data = dashboardService.getEmployeeDashboardData();
  res.json(data);
};

const getTechnicianDashboard = async (req, res) => {
  const data = dashboardService.getTechnicianDashboardData(req.user.id, req.user.name);
  res.json({ ...data, user: { id: req.user.id, name: req.user.name } });
};

const getCustomerDashboard = async (req, res) => {
  const data = dashboardService.getCustomerDashboardData(req.user.mobile);
  res.json(data);
};

module.exports = {
  getAdminDashboard,
  getSalesDashboard,
  getSalesDashboardDetails,
  getEmployeeDashboard,
  getTechnicianDashboard,
  getCustomerDashboard
};
