const { db, nowIso } = require("../../db");

const getSurveyByRequestId = (requestId) => {
  return db.prepare("SELECT * FROM site_visit_surveys WHERE service_request_id = ? ORDER BY submitted_at DESC LIMIT 1").get(requestId);
};

const createSurvey = (requestId, technicianId, data, photos) => {
  db.prepare(`
    INSERT INTO site_visit_surveys (
      service_request_id, technician_id, is_existing_installation, existing_setup_notes, work_needed,
      camera_count, cameras, nvr_dvr, cables, mounting, additional_parts, notes, photos, submitted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    requestId,
    technicianId,
    data.is_existing_installation === "1" || data.is_existing_installation === "true" ? 1 : 0,
    data.existing_setup_notes || null,
    data.work_needed || null,
    Number(data.camera_count) || 0,
    JSON.stringify(data.cameras || []),
    JSON.stringify(data.nvr_dvr || {}),
    JSON.stringify(data.cables || []),
    JSON.stringify(data.mounting || {}),
    JSON.stringify(data.additional_parts || []),
    data.notes || null,
    JSON.stringify(photos || []),
    nowIso()
  );

  db.prepare("UPDATE service_requests SET survey_status = 'submitted' WHERE id = ?").run(requestId);
};

const reviewSurvey = (requestId) => {
    db.prepare("UPDATE service_requests SET survey_status = 'reviewed' WHERE id = ?").run(requestId);
};

const updateCableMeters = (surveyId, actualMeterUsage) => {
    const survey = db.prepare("SELECT cables FROM site_visit_surveys WHERE id = ?").get(surveyId);
    if (!survey) return;

    let cables = [];
    try { cables = JSON.parse(survey.cables || '[]'); } catch (e) {}

    if (actualMeterUsage && typeof actualMeterUsage === 'object') {
      cables.forEach((c, i) => {
        if (actualMeterUsage[i] != null) c.actual_meters = Number(actualMeterUsage[i]) || 0;
      });
      db.prepare("UPDATE site_visit_surveys SET cables = ? WHERE id = ?").run(JSON.stringify(cables), surveyId);
    }
};

module.exports = {
  getSurveyByRequestId,
  createSurvey,
  reviewSurvey,
  updateCableMeters
};
