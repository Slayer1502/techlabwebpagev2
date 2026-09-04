const { db, makeId, nowIso } = require("../../db");

const getQuotes = (status) => {
  let sql = `
    SELECT sq.*, pt.name as supplier_name,
      (SELECT COUNT(*) FROM supplier_quote_items i WHERE i.quote_id = sq.id) as item_count
    FROM supplier_quotes sq
    LEFT JOIN parties pt ON sq.supplier_id = pt.id
    WHERE 1=1
  `;
  const params = [];
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    sql += ` AND sq.status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY sq.created_at DESC`;
  return db.prepare(sql).all(...params);
};

const getQuoteById = (id) => {
  const quote = db.prepare("SELECT sq.*, pt.name as supplier_name FROM supplier_quotes sq LEFT JOIN parties pt ON sq.supplier_id = pt.id WHERE sq.id = ?").get(id);
  if (!quote) return null;
  const items = db.prepare("SELECT * FROM supplier_quote_items WHERE quote_id = ?").all(id);
  return { quote, items };
};

const createQuote = (data) => {
  const { supplierId, quoteDate, validUntil, notes, items, pdfPath, pdfName } = data;
  const id = makeId("sq");
  const seq = db.prepare("SELECT COUNT(*) as c FROM supplier_quotes").get().c + 1;
  const quoteNumber = `SQ-${String(seq).padStart(4, "0")}`;
  const date = quoteDate || nowIso().slice(0, 10);
  const total = items.reduce((s, it) => s + (Number(it.quantity) * (Number(it.unitCost) || 0)), 0);

  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO supplier_quotes (id, quote_number, supplier_id, quote_date, valid_until, notes, status, total_amount, pdf_path, pdf_name, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`)
      .run(id, quoteNumber, supplierId, date, validUntil || null, notes || null, total, pdfPath || null, pdfName || null, nowIso());
    const insertItem = db.prepare(`INSERT INTO supplier_quote_items (id, quote_id, product_id, product_name, quantity, unit_cost) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const it of items) {
      insertItem.run(makeId("sqi"), id, it.productId || null, String(it.productName).trim(), Number(it.quantity), Number(it.unitCost) || 0);
    }
  });
  transaction();
  return { id, quoteNumber };
};

const approveQuote = (id, body) => {
  const quote = db.prepare("SELECT * FROM supplier_quotes WHERE id = ?").get(id);
  if (!quote) throw new Error("Quote not found");
  if (quote.status !== "pending") throw new Error("Only pending quotes can be approved");

  const allItems = db.prepare("SELECT * FROM supplier_quote_items WHERE quote_id = ?").all(id);
  let requested = Array.isArray(body?.items) ? body.items.filter(x => x && x.id) :
                    (Array.isArray(body?.itemIds) ? body.itemIds.filter(Boolean).map(id => ({ id })) : null);

  let items = allItems;
  let removed = [];
  if (requested) {
    const idSet = new Set(requested.map(r => String(r.id)));
    items = allItems.filter(it => idSet.has(String(it.id)));
    removed = allItems.filter(it => !idSet.has(String(it.id)));
    for (const it of items) {
      const r = requested.find(x => String(x.id) === String(it.id));
      const q = r && r.quantity != null ? Number(r.quantity) : NaN;
      if (Number.isFinite(q)) {
        if (!(q > 0)) throw new Error("Quantity must be at least 1");
        it.quantity = q;
      }
    }
  }
  if (!items.length) throw new Error("At least one item must remain to approve the quote");

  const approvedTotal = items.reduce((s, it) => s + (it.quantity * it.unit_cost), 0);
  const poId = makeId("po");
  const poSeq = db.prepare("SELECT COUNT(*) as c FROM purchase_orders").get().c + 1;
  const poNumber = `PO-${String(poSeq).padStart(4, "0")}`;
  const today = nowIso().slice(0, 10);

  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO purchase_orders (id, po_number, supplier_id, po_date, expected_date, notes, status, total_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, 'ordered', ?, ?)`)
      .run(poId, poNumber, quote.supplier_id, today, null, `From approved quote ${quote.quote_number}`, approvedTotal, nowIso());
    const insertItem = db.prepare(`INSERT INTO purchase_order_items (id, po_id, product_id, product_name, quantity, unit_cost) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const it of items) {
      insertItem.run(makeId("poi"), poId, it.product_id, it.product_name, it.quantity, it.unit_cost);
    }
    if (removed.length) {
      const delItem = db.prepare("DELETE FROM supplier_quote_items WHERE id = ?");
      for (const r of removed) delItem.run(r.id);
    }
    const updItem = db.prepare("UPDATE supplier_quote_items SET quantity = ? WHERE id = ?");
    for (const it of items) updItem.run(it.quantity, it.id);
    db.prepare("UPDATE supplier_quotes SET total_amount = ? WHERE id = ?").run(approvedTotal, id);
    db.prepare("UPDATE supplier_quotes SET status = 'approved', approved_at = ? WHERE id = ?").run(nowIso(), id);
  });
  transaction();
  return { poId, poNumber, total: approvedTotal };
};

const rejectQuote = (id) => {
  const quote = db.prepare("SELECT id, status FROM supplier_quotes WHERE id = ?").get(id);
  if (!quote) throw new Error("Quote not found");
  if (quote.status !== "pending") throw new Error("Only pending quotes can be rejected");
  db.prepare("UPDATE supplier_quotes SET status = 'rejected' WHERE id = ?").run(id);
};

const deleteQuote = (id) => {
  const quote = db.prepare("SELECT id, status FROM supplier_quotes WHERE id = ?").get(id);
  if (!quote) throw new Error("Quote not found");
  if (quote.status === "approved") throw new Error("Approved quotes cannot be deleted; delete the linked PO instead");

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM supplier_quote_items WHERE quote_id = ?").run(id);
    db.prepare("DELETE FROM supplier_quotes WHERE id = ?").run(id);
  });
  transaction();
};

module.exports = {
  getQuotes,
  getQuoteById,
  createQuote,
  approveQuote,
  rejectQuote,
  deleteQuote
};
