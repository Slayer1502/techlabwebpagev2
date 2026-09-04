const jwt = require("jsonwebtoken");
const config = require("../../config");
const { db, makeId, nowIso, getCustomerByMobile } = require("../../db");

const JWT_SECRET_FINAL = config.JWT_SECRET;
const OTP_TTL_MINUTES = config.OTP_TTL_MINUTES;

const createToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, mobile: user.mobile }, JWT_SECRET_FINAL, { expiresIn: "15m" });

const createRefreshToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, mobile: user.mobile }, JWT_SECRET_FINAL, { expiresIn: "30d" });

const setAuthCookie = (res, user) => {
  // We use 'lax' for sameSite to allow cookies to work across IP/localhost
  // during this transition phase. We disable 'secure' unless we are 100% on HTTPS.
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // Set to false to allow HTTP IP access
    maxAge: 15 * 60 * 1000,
  };

  res.cookie("techlab_token", createToken(user), cookieOptions);
  res.cookie("techlab_refresh", createRefreshToken(user), {
    ...cookieOptions,
    maxAge: config.REFRESH_COOKIE_MS,
  });
};

const generateOtp = (mobile) => {
  const otp = process.env.NODE_ENV === "production"
    ? String(require("crypto").randomInt(100000, 999999))
    : "123456";

  db.prepare("UPDATE otp_codes SET consumed_at = ? WHERE mobile = ? AND consumed_at IS NULL AND expires_at < ?").run(nowIso(), mobile, nowIso());
  db.prepare(`
    INSERT INTO otp_codes (id, mobile, code, expires_at, consumed_at)
    VALUES (?, ?, ?, ?, NULL)
  `).run(
    makeId("otp"),
    mobile,
    otp,
    new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString()
  );

  return otp;
};

const verifyOtp = (mobile, otp) => {
  const row = db.prepare(`
    SELECT id, mobile, code, expires_at, consumed_at FROM otp_codes
    WHERE mobile = ? AND code = ? AND consumed_at IS NULL
    ORDER BY expires_at DESC
    LIMIT 1
  `).get(mobile, otp);

  if (!row || new Date(row.expires_at) < new Date()) {
    return { error: "Invalid or expired OTP" };
  }

  db.prepare("UPDATE otp_codes SET consumed_at = ? WHERE id = ?").run(nowIso(), row.id);
  const customer = getCustomerByMobile(mobile);
  return { customer };
};

module.exports = {
  createToken,
  createRefreshToken,
  setAuthCookie,
  generateOtp,
  verifyOtp
};
