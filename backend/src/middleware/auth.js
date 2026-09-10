const jwt = require("jsonwebtoken");
const config = require("../../config");
const logger = require("../utils/logger");

const JWT_SECRET_FINAL = config.JWT_SECRET;

const authRequired = (roles = []) => (req, res, next) => {
  const token = req.cookies?.techlab_token;

  if (!token) {
    logger.warn({ method: req.method, url: req.url }, "No token found");
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET_FINAL);
    if (roles.length && !roles.includes(payload.role)) {
      logger.warn({ userRole: payload.role, required: roles, url: req.url }, "Role mismatch");
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    req.user = payload;
    return next();
  } catch (e) {
    logger.warn({ url: req.url, error: e.message }, "JWT verification failed");
    return res.status(401).json({ error: "Invalid session" });
  }
};

module.exports = { authRequired };
