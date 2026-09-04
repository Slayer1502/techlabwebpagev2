const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authRequired } = require("../middleware/auth");

router.post("/auth/customer/request-otp", authController.requestOtp);
router.post("/auth/customer/verify-otp", authController.verifyOtp);
router.post("/auth/staff/login", authController.staffLogin);
router.post("/auth/logout", authController.logout);
router.post("/auth/refresh", authController.refresh);
router.get("/me", authRequired(), authController.getMe);

module.exports = router;
