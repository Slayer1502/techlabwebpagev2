const userService = require("../services/userService");
const bcrypt = require("bcryptjs");

const getStaff = async (req, res) => {
  const { limit, offset } = require("../utils/helpers").parsePagination(req.query);
  const staff = userService.getStaffMembers(limit, offset);
  res.json({ staff });
};

const createStaff = async (req, res) => {
  const { name, email, mobile, password, role } = req.body;
  if (!name || !email || !mobile || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const existing = userService.getUserByEmail(email);
  if (existing) {
    return res.status(400).json({ error: "Email or username already in use" });
  }

  try {
    const id = userService.createStaffMember(req.body);
    res.json({ message: "Staff member added successfully", id });
  } catch (err) {
    res.status(400).json({ error: err.message.includes('UNIQUE') ? 'Mobile number already registered' : err.message });
  }
};

const deleteStaff = async (req, res) => {
  const staff = userService.getUserById(req.params.id);
  if (!staff) {
    return res.status(404).json({ error: "Staff member not found" });
  }

  if (req.user.id === staff.id) {
    return res.status(400).json({ error: "Cannot delete yourself" });
  }

  userService.deleteStaffMember(staff.id);
  return res.json({ message: "Staff member removed successfully" });
};

const resetStaffPassword = async (req, res) => {
  const staff = userService.getUserById(req.params.id);
  if (!staff) {
    return res.status(404).json({ error: "Staff member not found" });
  }

  const { password } = req.body;
  if (!password || String(password).trim().length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters" });
  }

  const hash = bcrypt.hashSync(String(password).trim(), 10);
  userService.updatePassword(staff.id, hash);
  return res.json({ message: "Password reset successfully" });
};

const getTechnicians = async (req, res) => {
    const technicians = userService.getTechnicians();
    res.json({ technicians });
};

module.exports = {
  getStaff,
  createStaff,
  deleteStaff,
  resetStaffPassword,
  getTechnicians
};
