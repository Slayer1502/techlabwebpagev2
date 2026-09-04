const jwt = require("jsonwebtoken");
const config = require("../../config");

const JWT_SECRET_FINAL = config.JWT_SECRET;

const authRequired = (roles = []) => (req, res, next) => {
  console.log(`[AUTH-CHECK] Checking: ${req.method} ${req.url}`);
  const token = req.cookies?.techlab_token;

  if (!token) {
    const stack = new Error().stack;
    console.warn(`[AUTH] ❌ No token found in cookies for: ${req.method} ${req.url}`);
    // console.log("[AUTH] Stack trace:", stack);
    return res.status(401).json({ error: "Authentication required", debugPath: req.url });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET_FINAL);
    if (roles.length && !roles.includes(payload.role)) {
      console.warn(`[AUTH] ❌ Role mismatch. User: ${payload.role}, Required: ${roles.join(",")}`);
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    req.user = payload;
    return next();
  } catch (e) {
    console.warn(`[AUTH] ❌ JWT Verify failed for ${req.url}: ${e.message}`);
    return res.status(401).json({ error: "Invalid session" });
  }
};

module.exports = { authRequired };
