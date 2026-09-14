const stockAlertService = require("../services/stockAlertService");

const getAlerts = async (req, res) => {
  try {
    const active = req.query.active !== "false";
    res.json({ alerts: stockAlertService.getAlerts({ active }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const scanAlerts = async (req, res) => {
  try {
    const result = stockAlertService.scanForAlerts();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const dismissAlert = async (req, res) => {
  try {
    stockAlertService.dismissAlert(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAlerts, scanAlerts, dismissAlert };
