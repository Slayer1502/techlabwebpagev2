const notificationService = require("./notificationService");
const { broadcastToRole, broadcastToUser } = require("../ws");

const pushToRole = (role) => {
  try {
    const notifications = notificationService.getNotifications(role, null);
    broadcastToRole(role, "notifications", { notifications });
  } catch (e) {}
};

const pushToUser = (userId, role) => {
  try {
    const notifications = notificationService.getNotifications(role, userId);
    broadcastToUser(userId, "notifications", { notifications });
  } catch (e) {}
};

const pushAll = () => {
  try {
    pushToRole("admin");
    pushToRole("sales");
    pushToRole("technician");
  } catch (e) {}
};

module.exports = { pushToRole, pushToUser, pushAll };
