const express = require("express");
const router = express.Router();
const appController = require("../controllers/appController");

router.get("/app/latest", appController.getLatestAppInfo);
router.get("/app/download", appController.downloadApp);

module.exports = router;
