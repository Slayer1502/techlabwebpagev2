const parseServiceRequestPayload = (payload) => {
  const deviceType = String(payload.deviceType || "").trim();
  const preferredDate = String(payload.preferredDate || "").trim();
  const issue = String(payload.issue || "").trim();
  const requestSubjectType = String(payload.requestSubjectType || "general-service").trim();
  const requestSubjectName = String(payload.requestSubjectName || "").trim();

  if (!deviceType || !preferredDate || !issue) {
    return { error: "Device type, preferred date, and issue are required" };
  }

  return {
    value: {
      deviceType,
      preferredDate,
      issue,
      requestSubjectType,
      requestSubjectName,
    },
  };
};

const validatePassword = (password) => {
  const p = String(password || "").trim();
  if (p.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(p)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(p)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(p)) return "Password must contain at least one digit";
  return null;
};

module.exports = { parseServiceRequestPayload, validatePassword };
