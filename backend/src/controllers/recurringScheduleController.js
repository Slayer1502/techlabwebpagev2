const recurringScheduleService = require("../services/recurringScheduleService");

const createSchedule = async (req, res) => {
  try {
    const schedule = recurringScheduleService.createSchedule({ ...req.body, user: req.user });
    res.json({ schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const listSchedules = async (req, res) => {
  try {
    const schedules = recurringScheduleService.listSchedules({
      ...req.query,
      active: req.query.active !== undefined ? req.query.active === "true" : null,
    });
    res.json({ schedules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getSchedule = async (req, res) => {
  try {
    const schedule = recurringScheduleService.getById(req.params.id);
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });
    res.json({ schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateSchedule = async (req, res) => {
  try {
    const schedule = recurringScheduleService.updateSchedule(req.params.id, req.body);
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });
    res.json({ schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const completeSchedule = async (req, res) => {
  try {
    const schedule = recurringScheduleService.markCompleted(req.params.id, req.body.completedDate);
    if (!schedule) return res.status(404).json({ error: "Schedule not found" });
    res.json({ schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    recurringScheduleService.deleteSchedule(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDue = async (req, res) => {
  try {
    res.json({ schedules: recurringScheduleService.getDueSchedules() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createSchedule, listSchedules, getSchedule, updateSchedule, completeSchedule, deleteSchedule, getDue };
