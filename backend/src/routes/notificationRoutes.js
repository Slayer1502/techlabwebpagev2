const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { authRequired } = require("../middleware/auth");

router.get("/notifications", authRequired(), notificationController.getNotifications);

module.exports = router;
