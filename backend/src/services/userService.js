const { db, nowIso } = require("../../db");

const getUserById = (id) => {
    return db.prepare("SELECT id, name, email, role, mobile FROM users WHERE id = ?").get(id);
};

const getUserByEmail = (email) => {
    return db.prepare("SELECT id, name, email, role, mobile, password_hash FROM users WHERE email = ? AND role IN ('admin', 'employee', 'sales', 'technician', 'auditor')").get(email);
};

const getStaffMembers = (limit, offset) => {
    return db.prepare(`
        SELECT id, name, email, mobile, role
        FROM users
        WHERE role IN ('admin', 'employee', 'sales', 'technician', 'auditor')
        ORDER BY role, name
        LIMIT ? OFFSET ?
    `).all(limit, offset);
};

const createStaffMember = (data) => {
    const id = `${data.role}-${Math.random().toString(36).slice(2, 6)}`;
    const bcrypt = require("bcryptjs");
    const hash = bcrypt.hashSync(data.password, 10);
    db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, mobile, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.email, hash, data.role, data.mobile, nowIso());
    return id;
};

const deleteStaffMember = (id) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
};

const updatePassword = (id, hash) => {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, id);
};

const getTechnicians = () => {
    return db.prepare("SELECT id, name, email, mobile FROM users WHERE role = 'technician'").all();
};

module.exports = {
    getUserById,
    getUserByEmail,
    getStaffMembers,
    createStaffMember,
    deleteStaffMember,
    updatePassword,
    getTechnicians
};
