const express = require("express");
const router = express.Router();
const surveyController = require("../controllers/surveyController");
const serviceRequestController = require("../controllers/serviceRequestController");
const { authRequired } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Move this to a central multer config later
const uploadsDir = path.join(__dirname, "../../../uploads");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `srv-${req.params.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Only image files are allowed"));
  },
});

// Technician Survey
router.get("/technician/service-requests/:id/survey", authRequired(["technician", "sales", "admin"]), surveyController.getSurvey);
router.post("/technician/service-requests/:id/survey", authRequired(["technician"]), upload.array("photos", 10), surveyController.submitSurvey);
router.post("/technician/service-requests/:id/job-complete", authRequired(["technician"]), serviceRequestController.jobComplete);
router.patch("/technician/service-requests/:id/update", authRequired(["technician"]), serviceRequestController.updateJobProgress);

// Sales Survey
router.get("/sales/service-requests/:id/survey", authRequired(["sales", "admin"]), surveyController.getSurvey);
router.patch("/sales/service-requests/:id/survey/review", authRequired(["sales", "admin"]), surveyController.reviewSurvey);

module.exports = router;
