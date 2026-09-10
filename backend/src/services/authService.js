const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../../config");
const { db, makeId, nowIso, getCustomerByMobile } = require("../../db");

const JWT_SECRET_FINAL = config.JWT_SECRET;
const JWT_REFRESH_SECRET_FINAL = config.JWT_REFRESH_SECRET;
const OTP_TTL_MINUTES = config.OTP_TTL_MINUTES;

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, mobile: user.mobile }, JWT_SECRET_FINAL, { expiresIn: "15m" });

const createRefreshToken = (user) =>
  jwt.sign({ id: user.id, role: user.role, mobile: user.mobile }, JWT_REFRESH_SECRET_FINAL, { expiresIn: "30d" });

const storeRefreshToken = (userId, token) => {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + config.REFRESH_COOKIE_MS).toISOString();
  db.prepare(
    "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)"
  ).run(makeId("rt"), userId, tokenHash, expiresAt, nowIso());
};

const isRefreshTokenRevoked = (token) => {
  const tokenHash = hashToken(token);
  const row = db.prepare(
    "SELECT id FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?"
  ).get(tokenHash, nowIso());
  return !row;
};

const revokeRefreshToken = (token) => {
  const tokenHash = hashToken(token);
  db.prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL")
    .run(nowIso(), tokenHash);
};

const revokeAllUserTokens = (userId) => {
  db.prepare("UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
    .run(nowIso(), userId);
};

const setAuthCookie = (res, user) => {
  const isProduction = config.IS_PRODUCTION;
  const cookieOptions = {
    httpOnly: true,
    sameSite: isProduction ? "strict" : "lax",
    secure: isProduction,
    maxAge: 15 * 60 * 1000,
  };

  res.cookie("techlab_token", createToken(user), cookieOptions);
  const refreshToken = createRefreshToken(user);
  res.cookie("techlab_refresh", refreshToken, {
    ...cookieOptions,
    maxAge: config.REFRESH_COOKIE_MS,
  });
  storeRefreshToken(user.id, refreshToken);
};

const generateOtp = (mobile) => {
  const otp = String(crypto.randomInt(100000, 999999));

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
  verifyOtp,
  isRefreshTokenRevoked,
  revokeRefreshToken,
  revokeAllUserTokens,
};
