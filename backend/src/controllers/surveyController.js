const surveyService = require("../services/surveyService");
const serviceRequestService = require("../services/serviceRequestService");
const { isSiteVisitType } = require("../utils/helpers");

const getSurvey = async (req, res) => {
  const survey = surveyService.getSurveyByRequestId(req.params.id);
  res.json({ survey: survey || null });
};

const submitSurvey = async (req, res) => {
  const requestId = req.params.id;
  const request = serviceRequestService.getServiceRequestById(requestId);

  if (!request) return res.status(404).json({ error: "Service request not found" });

  if (!isSiteVisitType(request.device_type)) {
    return res.status(400).json({ error: "Survey is only available for site visit requests" });
  }

  if (request.assigned_employee_id !== req.user.id) {
    return res.status(403).json({ error: "Only the assigned technician can submit a survey" });
  }

  let body = req.body;
  try {
    if (typeof body.cameras === "string") body.cameras = JSON.parse(body.cameras);
    if (typeof body.cables === "string") body.cables = JSON.parse(body.cables);
    if (typeof body.mounting === "string") body.mounting = JSON.parse(body.mounting);
    if (typeof body.additional_parts === "string") body.additional_parts = JSON.parse(body.additional_parts);
    if (typeof body.nvr_dvr === "string") body.nvr_dvr = JSON.parse(body.nvr_dvr);
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON in form data" });
  }

  const photoFiles = (req.files || []).map(f => `/uploads/${f.filename}`);

  surveyService.createSurvey(requestId, req.user.id, body, photoFiles);

  res.json({ message: "Site visit survey submitted successfully", photos: photoFiles });
};

const reviewSurvey = async (req, res) => {
  const request = serviceRequestService.getServiceRequestById(req.params.id);
  if (!request) return res.status(404).json({ error: "Service request not found" });

  if (request.survey_status !== "submitted") {
    return res.status(400).json({ error: "No submitted survey to review" });
  }

  surveyService.reviewSurvey(req.params.id);
  res.json({ message: "Survey reviewed. Technician can now proceed with the work." });
};

module.exports = {
  getSurvey,
  submitSurvey,
  reviewSurvey
};
