const notificationService = require("../services/notificationService");

const getNotifications = async (req, res) => {
  try {
    const notifications = notificationService.getNotifications(req.user.role, req.user.id);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getNotifications
};
