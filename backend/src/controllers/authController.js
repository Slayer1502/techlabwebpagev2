const authService = require("../services/authService");
const userService = require("../services/userService");
const customerService = require("../services/customerService");
const { checkRateLimit } = require("../utils/rateLimiter");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../../config");

const requestOtp = async (req, res) => {
  const { mobile } = req.body;
  if (!mobile) {
    return res.status(400).json({ error: "Mobile is required" });
  }

  const clientKey = `otp:${mobile}`;
  if (!checkRateLimit(clientKey)) {
    return res.status(429).json({ error: "Too many requests. Try again later." });
  }

  customerService.syncCustomerToParties(`Customer ${mobile.slice(-4)}`, mobile);

  const otp = authService.generateOtp(mobile);

  return res.json({
    message: "OTP generated",
    otpPreview: process.env.NODE_ENV === "production" ? undefined : otp,
  });
};

const verifyOtp = async (req, res) => {
  const { mobile, otp } = req.body;

  const clientKey = `verify:${mobile}`;
  if (!checkRateLimit(clientKey)) {
    return res.status(429).json({ error: "Too many attempts. Try again later." });
  }

  const result = authService.verifyOtp(mobile, otp);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  authService.setAuthCookie(res, result.customer);
  return res.json({ user: result.customer });
};

const staffLogin = async (req, res) => {
  const { email, password } = req.body;
  const clientKey = `login:${email}`;
  if (!checkRateLimit(clientKey)) {
    return res.status(429).json({ error: "Too many login attempts. Try again later." });
  }

  const user = userService.getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash || "")) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  authService.setAuthCookie(res, user);
  return res.json({ user: { id: user.id, role: user.role, name: user.name } });
};

const logout = async (req, res) => {
  res.clearCookie("techlab_token");
  res.clearCookie("techlab_refresh");
  res.json({ message: "Logged out" });
};

const refresh = async (req, res) => {
  const token = req.cookies.techlab_refresh;
  if (!token) {
    return res.status(401).json({ error: "No refresh session" });
  }

  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const user = userService.getUserById(payload.id);
    if (!user) {
      return res.status(401).json({ error: "Invalid session" });
    }
    authService.setAuthCookie(res, user);
    return res.json({ user: { id: user.id, role: user.role, name: user.name } });
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
};

const getMe = async (req, res) => {
    const user = userService.getUserById(req.user.id);
    if (!user) return res.status(401).json({ error: "User no longer exists" });
    return res.json({ user: { id: user.id, role: user.role, name: user.name, mobile: user.mobile } });
};

module.exports = {
  requestOtp,
  verifyOtp,
  staffLogin,
  logout,
  refresh,
  getMe
};
