const crypto = require("crypto");

const CSRF_COOKIE_NAME = "techlab_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

const generateCsrfToken = () =>
  crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");

const setCsrfCookie = (res) => {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 1000,
  });
  return token;
};

const csrfValidate = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: "CSRF token missing" });
  }

  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return res.status(403).json({ error: "CSRF token invalid" });
  }

  next();
};

module.exports = { setCsrfCookie, csrfValidate, CSRF_COOKIE_NAME };
