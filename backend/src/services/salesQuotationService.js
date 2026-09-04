const { db, makeId, nowIso, getQuoteSeq } = require("../../db");
const { syncCustomerToParties } = require("./customerService");

const getQuotations = (status) => {
  let sql = `
    SELECT sq.*,
      (SELECT COUNT(*) FROM sales_quotation_items i WHERE i.quote_id = sq.id) as item_count
    FROM sales_quotations sq
    WHERE 1=1
  `;
  const params = [];
  if (status && ["pending", "converted", "cancelled"].includes(status)) {
    sql += ` AND sq.status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY sq.quote_number DESC`;
  const quotations = db.prepare(sql).all(...params);
  const itemStmt = db.prepare("SELECT * FROM sales_quotation_items WHERE quote_id = ?");
  for (const q of quotations) q.items = itemStmt.all(q.id);
  return quotations;
};

const getQuotationById = (id) => {
  const quotation = db.prepare("SELECT * FROM sales_quotations WHERE id = ?").get(id);
  if (!quotation) return null;
  const items = db.prepare("SELECT * FROM sales_quotation_items WHERE quote_id = ?").all(id);
  return { quotation, items };
};

const productExistsStmt = db.prepare("SELECT 1 FROM products WHERE id = ?");

const normalizeItem = (it) => {
  let productId = it.productId ?? it.product_id ?? null;
  productId = productId == null ? null : String(productId).trim() || null;
  if (productId && !productExistsStmt.get(productId)) productId = null;
  return {
    productId,
    productName: String(it.productName ?? it.product_name ?? "").trim(),
    quantity: Number(it.quantity) || 0,
    unitPrice: Number(it.unitPrice ?? it.unit_price) || 0
  };
};

const createQuotation = (data, actorName) => {
  const { customerName, customerMobile, customerAddress, quoteDate, validUntil, notes, items, serviceRequestId } = data;

  syncCustomerToParties(customerName, customerMobile);

  const id = makeId("squot");
  const quoteNumber = getQuoteSeq();
  const date = quoteDate || nowIso().slice(0, 10);
  const total = items.reduce((s, it) => s + (Number(it.quantity) * (Number(it.unitPrice ?? it.unit_price) || 0)), 0);

  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO sales_quotations (id, quote_number, customer_name, customer_mobile, customer_address, quote_date, valid_until, total_amount, status, notes, created_by, created_at, service_request_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`)
      .run(id, quoteNumber, String(customerName).trim(), customerMobile || null, customerAddress || null, date, validUntil || null, total, notes || null, actorName, nowIso(), serviceRequestId || null);
    const insertItem = db.prepare(`INSERT INTO sales_quotation_items (id, quote_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const it of items) {
      const n = normalizeItem(it);
      insertItem.run(makeId("sqi"), id, n.productId, n.productName, n.quantity, n.unitPrice);
    }
  });
  transaction();
  return { id, quoteNumber };
};

const updateQuotation = (id, data) => {
  const quotation = db.prepare("SELECT * FROM sales_quotations WHERE id = ?").get(id);
  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status !== "pending") throw new Error("Only pending quotations can be edited");

  const { customerName, customerMobile, customerAddress, quoteDate, validUntil, notes, items, serviceRequestId } = data;
  const total = items.reduce((s, it) => s + (Number(it.quantity) * (Number(it.unitPrice ?? it.unit_price) || 0)), 0);

  const transaction = db.transaction(() => {
    db.prepare(`UPDATE sales_quotations SET customer_name = ?, customer_mobile = ?, customer_address = ?, quote_date = ?, valid_until = ?, total_amount = ?, notes = ?, service_request_id = ? WHERE id = ?`)
      .run(String(customerName).trim(), customerMobile || null, customerAddress || null, quoteDate || quotation.quote_date, validUntil || null, total, notes || null, serviceRequestId || null, id);
    db.prepare("DELETE FROM sales_quotation_items WHERE quote_id = ?").run(id);
    const insertItem = db.prepare(`INSERT INTO sales_quotation_items (id, quote_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const it of items) {
      const n = normalizeItem(it);
      insertItem.run(makeId("sqi"), id, n.productId, n.productName, n.quantity, n.unitPrice);
    }
  });
  transaction();
};

const convertQuotation = (id) => {
  const quotation = db.prepare("SELECT * FROM sales_quotations WHERE id = ?").get(id);
  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status === "converted") throw new Error("Quotation already converted");
  db.prepare("UPDATE sales_quotations SET status = 'converted', converted_at = ? WHERE id = ?").run(nowIso(), id);
};

const deleteQuotation = (id) => {
  const quotation = db.prepare("SELECT id, status FROM sales_quotations WHERE id = ?").get(id);
  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status === "converted") throw new Error("Converted quotations cannot be deleted");

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM sales_quotation_items WHERE quote_id = ?").run(id);
    db.prepare("DELETE FROM sales_quotations WHERE id = ?").run(id);
  });
  transaction();
};

module.exports = {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  convertQuotation,
  deleteQuotation
};
