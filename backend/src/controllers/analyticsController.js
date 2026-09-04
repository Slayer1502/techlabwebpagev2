const analyticsService = require("../services/analyticsService");

const getAnalytics = async (req, res) => {
  const data = analyticsService.getAnalyticsData();
  res.json(data);
};

module.exports = {
  getAnalytics
};
