const express = require("express");
const router = express.Router();
const path = require("path");

router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Root route removed here - handled by server.js for SPA support

module.exports = router;
