const auditService = require("../services/auditService");

const captureValue = (body) => {
  try {
    return body && typeof body === "object" ? { ...body } : body;
  } catch (e) {
    return null;
  }
};

const auditAutomatic = (entityType) => (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    try {
      if (isMutating(req.method)) {
        const entityId = req.params.id || req.body?.id || body?.id || null;
        auditService.log({
          userId: req.user?.id,
          userName: req.user?.name,
          userRole: req.user?.role,
          action: `${req.method} ${entityType}`,
          entityType,
          entityId,
          newValue: captureValue(req.body),
          ipAddress: req.ip,
        });
      }
    } catch (e) {}
    return originalJson(body);
  };

  next();
};

const isMutating = (method) => ["POST", "PATCH", "PUT", "DELETE"].includes(method);

module.exports = { auditAutomatic };
