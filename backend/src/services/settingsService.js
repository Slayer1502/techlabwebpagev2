const { db, makeId, nowIso } = require("../../db");

const getBusinessSettings = () => {
  const rows = db.prepare("SELECT key, value FROM business_settings").all();
  const map = {
    business_name: "TECHLAB",
    gstin: "33CEMPK3724B2ZU",
    business_phone: "+91 94888-0-9897",
    business_email: "techlabkarur@gmail.com",
    business_address: "Casa Layout, Karur - 639001, Tamil Nadu",
    google_review_url: "https://g.page/r/techlab-karur/review",
    fuel_city: "Karur",
    gmail_app_password: ""
  };
  rows.forEach(r => {
    if (r.value) map[r.key] = r.value;
  });
  return map;
};

const updateBusinessSettings = (data) => {
  const upsert = db.prepare("INSERT INTO business_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  const transaction = db.transaction(() => {
    if (data.business_name !== undefined) upsert.run("business_name", String(data.business_name || ""));
    if (data.gstin !== undefined) upsert.run("gstin", String(data.gstin || ""));
    if (data.business_phone !== undefined) upsert.run("business_phone", String(data.business_phone || ""));
    if (data.business_email !== undefined) upsert.run("business_email", String(data.business_email || ""));
    if (data.business_address !== undefined) upsert.run("business_address", String(data.business_address || ""));
    if (data.google_review_url !== undefined) upsert.run("google_review_url", String(data.google_review_url || ""));
    if (data.fuel_city !== undefined) upsert.run("fuel_city", String(data.fuel_city || ""));
    if (data.gmail_app_password !== undefined) upsert.run("gmail_app_password", String(data.gmail_app_password || ""));
  });
  transaction();
};

const getBankAccounts = () => {
  return db.prepare("SELECT * FROM bank_accounts ORDER BY is_primary DESC, created_at DESC").all();
};

const createBankAccount = (data) => {
  const id = makeId("bank");
  const transaction = db.transaction(() => {
    if (data.isPrimary) {
      db.prepare("UPDATE bank_accounts SET is_primary = 0").run();
    }
    db.prepare(`
      INSERT INTO bank_accounts (id, bank_name, account_holder, account_number, ifsc, upi_id, is_primary, show_qr, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.bankName,
      data.accountHolder,
      data.accountNumber,
      data.ifsc,
      data.upiId || null,
      data.isPrimary ? 1 : 0,
      data.showQr ? 1 : 0,
      nowIso()
    );
  });
  transaction();
  return id;
};

const toggleBankQr = (id, showQr) => {
  if (showQr !== undefined) {
    db.prepare("UPDATE bank_accounts SET show_qr = ? WHERE id = ?").run(showQr ? 1 : 0, id);
  } else {
    db.prepare("UPDATE bank_accounts SET show_qr = CASE WHEN show_qr = 1 THEN 0 ELSE 1 END WHERE id = ?").run(id);
  }
};

const deleteBankAccount = (id) => {
  db.prepare("DELETE FROM bank_accounts WHERE id = ?").run(id);
};

const setPrimaryBankAccount = (id) => {
  const transaction = db.transaction(() => {
    db.prepare("UPDATE bank_accounts SET is_primary = 0").run();
    db.prepare("UPDATE bank_accounts SET is_primary = 1 WHERE id = ?").run(id);
  });
  transaction();
};

module.exports = {
  getBusinessSettings,
  updateBusinessSettings,
  getBankAccounts,
  createBankAccount,
  toggleBankQr,
  deleteBankAccount,
  setPrimaryBankAccount
};
