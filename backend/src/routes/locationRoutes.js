const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationController");
const { authRequired } = require("../middleware/auth");

router.post("/technician/service-requests/:requestId/location", authRequired(["technician"]), locationController.reportLocation);
router.get("/sales/service-requests/:requestId/location", authRequired(["sales", "admin"]), locationController.getLocation);

module.exports = router;
