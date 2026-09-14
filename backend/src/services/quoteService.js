const { db, makeId, nowIso } = require("../../db");

const SOURCE_SELECT = `
  SELECT sq.*, pt.name as supplier_name,
    sr.customer_name as service_customer_name, sr.device_type as service_device_type,
    (SELECT po_number FROM purchase_orders pod WHERE pod.id = sq.po_id) as po_number,
    (SELECT COUNT(*) FROM supplier_quote_items i WHERE i.quote_id = sq.id) as item_count
  FROM supplier_quotes sq
  LEFT JOIN parties pt ON sq.supplier_id = pt.id
  LEFT JOIN service_requests sr ON sr.id = sq.service_request_id
`;

const getQuotes = (status) => {
  let sql = SOURCE_SELECT + ` WHERE 1=1 `;
  const params = [];
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    sql += ` AND sq.status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY sq.created_at DESC`;
  return db.prepare(sql).all(...params);
};

const getQuoteById = (id) => {
  const quote = db.prepare(SOURCE_SELECT + ` WHERE sq.id = ?`).get(id);
  if (!quote) return null;
  const items = db.prepare("SELECT * FROM supplier_quote_items WHERE quote_id = ?").all(id);
  return { quote, items };
};

const getQuotesForServiceRequest = (serviceRequestId) => {
  return db.prepare(SOURCE_SELECT + ` WHERE sq.service_request_id = ? ORDER BY sq.created_at DESC`).all(serviceRequestId);
};

const createQuote = (data) => {
  const { supplierId, quoteDate, validUntil, notes, items, pdfPath, pdfName, enquiryId, serviceRequestId } = data;
  const id = makeId("sq");
  const seq = db.prepare("SELECT COUNT(*) as c FROM supplier_quotes").get().c + 1;
  const quoteNumber = `SQ-${String(seq).padStart(4, "0")}`;
  const date = quoteDate || nowIso().slice(0, 10);
  const total = items.reduce((s, it) => s + (Number(it.quantity) * (Number(it.unitCost) || 0)), 0);

  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO supplier_quotes (id, quote_number, supplier_id, quote_date, valid_until, notes, status, total_amount, pdf_path, pdf_name, for_enquiry_id, service_request_id, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`)
      .run(id, quoteNumber, supplierId, date, validUntil || null, notes || null, total, pdfPath || null, pdfName || null, enquiryId || null, serviceRequestId || null, nowIso());
    const insertItem = db.prepare(`INSERT INTO supplier_quote_items (id, quote_id, product_id, product_name, quantity, unit_cost, brand, model) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const it of items) {
      insertItem.run(
        makeId("sqi"), id, it.productId || null, String(it.productName ?? it.name ?? "").trim(),
        Number(it.quantity), Number(it.unitCost ?? it.unit_cost) || 0,
        String(it.brand || "").trim() || null, String(it.model || "").trim() || null
      );
    }
    if (serviceRequestId) {
      setBuyoutStatus(serviceRequestId, "quote_requested", { supplierQuoteId: id, quoteNumber });
    }
  });
  transaction();
  return { id, quoteNumber };
};

const setBuyoutStatus = (serviceRequestId, status, extra = {}) => {
  const req = db.prepare("SELECT buyout_requisition FROM service_requests WHERE id = ?").get(serviceRequestId);
  if (!req) return;
  let record = {};
  try { record = req.buyout_requisition ? JSON.parse(req.buyout_requisition) : {}; } catch { record = {}; }
  db.prepare("UPDATE service_requests SET buyout_requisition = ? WHERE id = ?")
    .run(JSON.stringify({ ...record, ...extra, status }), serviceRequestId);
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
  const deferredToEnquiry = Boolean(quote.for_enquiry_id);
  let poResult = { poId: null, poNumber: null };

  const transaction = db.transaction(() => {
    if (deferredToEnquiry) {
      const enquiry = db.prepare("SELECT id, quote_options FROM enquiries WHERE id = ?").get(quote.for_enquiry_id);
      if (enquiry && enquiry.quote_options) {
        try {
          const opts = JSON.parse(enquiry.quote_options);
          let changed = false;
          for (const o of opts) {
            if (o.sqId === quote.id) {
              o.costPrice = approvedTotal;
              o.sqNumber = quote.quote_number;
              changed = true;
            }
          }
          if (changed) db.prepare("UPDATE enquiries SET quote_options = ? WHERE id = ?").run(JSON.stringify(opts), enquiry.id);
        } catch (e) { /* keep saved options as-is on parse failure */ }
      }
    } else {
      const poId = makeId("po");
      const poSeq = db.prepare("SELECT COUNT(*) as c FROM purchase_orders").get().c + 1;
      const poNumber = `PO-${String(poSeq).padStart(4, "0")}`;
      const today = nowIso().slice(0, 10);
      poResult = { poId, poNumber };
      db.prepare(`INSERT INTO purchase_orders (id, po_number, supplier_id, po_date, expected_date, notes, status, total_amount, service_request_id, created_at) VALUES (?, ?, ?, ?, ?, ?, 'ordered', ?, ?, ?)`)
        .run(poId, poNumber, quote.supplier_id, today, null, `From approved quote ${quote.quote_number}`, approvedTotal, quote.service_request_id || null, nowIso());
      const insertItem = db.prepare(`INSERT INTO purchase_order_items (id, po_id, product_id, product_name, quantity, unit_cost) VALUES (?, ?, ?, ?, ?, ?)`);
      for (const it of items) {
        insertItem.run(makeId("poi"), poId, it.product_id, it.product_name, it.quantity, it.unit_cost);
      }
      db.prepare("UPDATE supplier_quotes SET po_id = ? WHERE id = ?").run(poId, id);
      if (quote.service_request_id) {
        setBuyoutStatus(quote.service_request_id, "po_placed", { supplierQuoteId: id, quoteNumber: quote.quote_number, poId, poNumber });
      }
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
  if (deferredToEnquiry) {
    return { poId: null, poNumber: null, total: approvedTotal, enquiryId: quote.for_enquiry_id };
  }
  return { poId: poResult.poId, poNumber: poResult.poNumber, total: approvedTotal };
};

const rejectQuote = (id) => {
  const quote = db.prepare("SELECT id, status, service_request_id FROM supplier_quotes WHERE id = ?").get(id);
  if (!quote) throw new Error("Quote not found");
  if (quote.status !== "pending") throw new Error("Only pending quotes can be rejected");
  db.prepare("UPDATE supplier_quotes SET status = 'rejected' WHERE id = ?").run(id);
  if (quote.service_request_id) {
    setBuyoutStatus(quote.service_request_id, "rejected", { supplierQuoteId: id });
  }
};

// Attach the supplier's returned PDF and the reverted prices to a pending quote.
const attachQuotePdf = (id, data) => {
  const { pdfPath, pdfName, items } = data;
  const quote = db.prepare("SELECT * FROM supplier_quotes WHERE id = ?").get(id);
  if (!quote) throw new Error("Quote not found");
  if (quote.status !== "pending") throw new Error("Only pending quotes can accept a supplier PDF");

  let total = 0;
  const transaction = db.transaction(() => {
    if (Array.isArray(items)) {
      const updCost = db.prepare("UPDATE supplier_quote_items SET unit_cost = ? WHERE id = ?");
      const updName = db.prepare("UPDATE supplier_quote_items SET product_name = ? WHERE id = ?");
      for (const it of items) {
        if (!it || !it.id) continue;
        if (it.unitCost !== undefined && it.unitCost !== null && !Number.isNaN(Number(it.unitCost))) {
          updCost.run(Math.round(Number(it.unitCost) || 0), it.id);
        }
        if (String(it.name || "").trim()) {
          updName.run(String(it.name).trim(), it.id);
        }
      }
    }
    total = db.prepare("SELECT COALESCE(SUM(quantity * unit_cost), 0) as total FROM supplier_quote_items WHERE quote_id = ?").get(id).total;
    db.prepare("UPDATE supplier_quotes SET pdf_path = ?, pdf_name = ?, total_amount = ? WHERE id = ?")
      .run(pdfPath || null, pdfName || null, total, id);
    if (quote.service_request_id) {
      setBuyoutStatus(quote.service_request_id, "uploaded", { supplierQuoteId: id, quoteNumber: quote.quote_number });
    }
  });
  transaction();
  return { total };
};

const deleteQuote = (id) => {
  const quote = db.prepare("SELECT id, status, service_request_id FROM supplier_quotes WHERE id = ?").get(id);
  if (!quote) throw new Error("Quote not found");
  if (quote.status === "approved") throw new Error("Approved quotes cannot be deleted; delete the linked PO instead");

  const transaction = db.transaction(() => {
    if (quote.service_request_id) {
      const req = db.prepare("SELECT buyout_requisition FROM service_requests WHERE id = ?").get(quote.service_request_id);
      let record = {};
      try { record = req?.buyout_requisition ? JSON.parse(req.buyout_requisition) : {}; } catch { record = {}; }
      if (record.supplierQuoteId === id) {
        db.prepare("UPDATE service_requests SET buyout_requisition = NULL WHERE id = ?").run(quote.service_request_id);
      }
    }
    db.prepare("DELETE FROM supplier_quote_items WHERE quote_id = ?").run(id);
    db.prepare("DELETE FROM supplier_quotes WHERE id = ?").run(id);
  });
  transaction();
};

module.exports = {
  getQuotes,
  getQuoteById,
  getQuotesForServiceRequest,
  createQuote,
  approveQuote,
  rejectQuote,
  attachQuotePdf,
  deleteQuote
};
