const authService = require("../services/authService");
const userService = require("../services/userService");
const customerService = require("../services/customerService");
const { checkRateLimit } = require("../utils/rateLimiter");
const { setCsrfCookie, CSRF_COOKIE_NAME } = require("../middleware/csrf");
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
  setCsrfCookie(res);
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
  setCsrfCookie(res);
  return res.json({ user: { id: user.id, role: user.role, name: user.name } });
};

const logout = async (req, res) => {
  const refreshToken = req.cookies.techlab_refresh;
  if (refreshToken) {
    authService.revokeRefreshToken(refreshToken);
  }
  res.clearCookie("techlab_token");
  res.clearCookie("techlab_refresh");
  res.clearCookie(CSRF_COOKIE_NAME);
  res.json({ message: "Logged out" });
};

const refresh = async (req, res) => {
  const token = req.cookies.techlab_refresh;
  if (!token) {
    return res.status(401).json({ error: "No refresh session" });
  }

  try {
    const payload = jwt.verify(token, config.JWT_REFRESH_SECRET);

    if (authService.isRefreshTokenRevoked(token)) {
      return res.status(401).json({ error: "Session revoked" });
    }

    const user = payload.role === "customer"
      ? customerService.getCustomerRecordByMobile(payload.mobile)
      : userService.getUserById(payload.id);
    if (!user) {
      return res.status(401).json({ error: "Invalid session" });
    }

    authService.revokeRefreshToken(token);
    authService.setAuthCookie(res, user);
    setCsrfCookie(res);
    return res.json({ user: { id: user.id, role: user.role, name: user.name } });
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
};

const getMe = async (req, res) => {
    const user = req.user.role === "customer"
      ? customerService.getCustomerRecordByMobile(req.user.mobile)
      : userService.getUserById(req.user.id);
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
