const { db, makeId, nowIso } = require("../../db");

const getUserByMobile = db.prepare("SELECT id, name, email, role, mobile FROM users WHERE mobile = ?");
const insertCustomer = db.prepare(`
  INSERT INTO users (id, name, email, password_hash, role, mobile, created_at)
  VALUES (@id, @name, NULL, NULL, 'customer', @mobile, @created_at)
`);

const syncCustomerToParties = (name, mobile) => {
  if (!mobile) return;
  // Ensure they exist in users table
  let customer = getUserByMobile.get(mobile);
  if (!customer) {
    insertCustomer.run({
      id: makeId("customer"),
      name: name,
      mobile,
      created_at: nowIso(),
    });
  }

  // Ensure they exist in parties table as is_customer = 1
  const existingParty = db.prepare("SELECT id FROM parties WHERE mobile = ?").get(mobile);
  if (existingParty) {
    db.prepare("UPDATE parties SET is_customer = 1, name = ? WHERE id = ?").run(name, existingParty.id);
  } else {
    const id = `party-${Math.random().toString(36).slice(2, 8)}`;
    db.prepare(`INSERT INTO parties (id, name, mobile, is_customer, created_at) VALUES (?, ?, ?, 1, ?)`)
      .run(id, name, mobile, nowIso());
  }
};

module.exports = { syncCustomerToParties, getUserByMobile };
