const notificationService = require("../services/notificationService");
const { broadcastToUser } = require("../ws");

const getNotifications = async (req, res) => {
  try {
    const notifications = notificationService.getNotifications(req.user.role, req.user.id);
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const pushNotificationsToUser = (userId, notifications) => {
  try {
    broadcastToUser(userId, "notifications", { notifications });
  } catch (e) {}
};

module.exports = {
  getNotifications,
  pushNotificationsToUser,
};
