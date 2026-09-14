const locationService = require("../services/locationService");

const reportLocation = async (req, res) => {
  try {
    const { lat, lng, accuracy, note } = req.body;
    const requestId = req.params.requestId;
    if (lat == null || lng == null) return res.status(400).json({ error: "lat and lng required" });
    const result = locationService.reportLocation({ requestId, lat: Number(lat), lng: Number(lng), accuracy: accuracy != null ? Number(accuracy) : null, note });
    if (!result) return res.status(404).json({ error: "Service request not found" });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getLocation = async (req, res) => {
  try {
    const result = locationService.getLocation(req.params.requestId);
    if (!result) return res.status(404).json({ error: "Service request not found" });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { reportLocation, getLocation };
