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

module.exports = { parseServiceRequestPayload };
