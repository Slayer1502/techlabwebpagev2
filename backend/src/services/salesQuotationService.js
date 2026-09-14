const { db, makeId, nowIso, getQuoteSeq } = require("../../db");
const { syncCustomerToParties } = require("./customerService");
const quotationVersionService = require("./quotationVersionService");

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

const getByServiceRequest = (serviceRequestId) => {
  return db.prepare("SELECT * FROM sales_quotations WHERE service_request_id = ? ORDER BY created_at DESC LIMIT 1").get(serviceRequestId) || null;
};

const getByEnquiryId = (enquiryId) => {
  return db.prepare("SELECT * FROM sales_quotations WHERE enquiry_id = ? ORDER BY created_at DESC LIMIT 1").get(enquiryId) || null;
};

const productExistsStmt = db.prepare("SELECT 1 FROM products WHERE id = ?");

const normalizeItem = (it) => {
  let productId = it.productId ?? it.product_id ?? null;
  productId = productId == null ? null : String(productId).trim() || null;
  if (productId && !productExistsStmt.get(productId)) productId = null;
  let supplierId = it.supplierId ?? it.supplier_id ?? null;
  supplierId = supplierId == null ? null : String(supplierId).trim() || null;
  return {
    productId,
    productName: String(it.productName ?? it.product_name ?? "").trim(),
    quantity: Number(it.quantity) || 0,
    unitPrice: Number(it.unitPrice ?? it.unit_price) || 0,
    unitCost: Number(it.unitCost ?? it.unit_cost) || 0,
    source: it.source === "procurement" ? "procurement" : it.source === "inventory" ? "inventory" : null,
    supplierId,
    sqId: it.sqId ?? it.sq_id ?? null,
    sqNumber: it.sqNumber ?? it.sq_number ?? null
  };
};

const createQuotation = (data, actorName) => {
  const { customerName, customerMobile, customerAddress, quoteDate, validUntil, notes, items, serviceRequestId, enquiryId } = data;

  syncCustomerToParties(customerName, customerMobile);

  const id = makeId("squot");
  const quoteNumber = getQuoteSeq();
  const date = quoteDate || nowIso().slice(0, 10);
  const total = items.reduce((s, it) => s + (Number(it.quantity) * (Number(it.unitPrice ?? it.unit_price) || 0)), 0);

  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO sales_quotations (id, quote_number, customer_name, customer_mobile, customer_address, quote_date, valid_until, total_amount, status, notes, created_by, created_at, service_request_id, enquiry_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`)
      .run(id, quoteNumber, String(customerName).trim(), customerMobile || null, customerAddress || null, date, validUntil || null, total, notes || null, actorName, nowIso(), serviceRequestId || null, enquiryId || null);
    const insertItem = db.prepare(`INSERT INTO sales_quotation_items (id, quote_id, product_id, product_name, quantity, unit_price, unit_cost, source, supplier_id, sq_id, sq_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const it of items) {
      const n = normalizeItem(it);
      insertItem.run(makeId("sqi"), id, n.productId, n.productName, n.quantity, n.unitPrice, n.unitCost, n.source, n.supplierId, n.sqId, n.sqNumber);
    }
  });
  transaction();
  return { id, quoteNumber };
};

const updateQuotation = (id, data) => {
  const quotation = db.prepare("SELECT * FROM sales_quotations WHERE id = ?").get(id);
  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status !== "pending") throw new Error("Only pending quotations can be edited");

  const { customerName, customerMobile, customerAddress, quoteDate, validUntil, notes, items, serviceRequestId, enquiryId } = data;
  const total = items.reduce((s, it) => s + (Number(it.quantity) * (Number(it.unitPrice ?? it.unit_price) || 0)), 0);

  const transaction = db.transaction(() => {
    quotationVersionService.snapshotQuotation(id, null);
    db.prepare(`UPDATE sales_quotations SET customer_name = ?, customer_mobile = ?, customer_address = ?, quote_date = ?, valid_until = ?, total_amount = ?, notes = ?, service_request_id = ?, enquiry_id = ? WHERE id = ?`)
      .run(String(customerName).trim(), customerMobile || null, customerAddress || null, quoteDate || quotation.quote_date, validUntil || null, total, notes || null, serviceRequestId ?? quotation.service_request_id, enquiryId ?? quotation.enquiry_id, id);
    db.prepare("DELETE FROM sales_quotation_items WHERE quote_id = ?").run(id);
    const insertItem = db.prepare(`INSERT INTO sales_quotation_items (id, quote_id, product_id, product_name, quantity, unit_price, unit_cost, source, supplier_id, sq_id, sq_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const it of items) {
      const n = normalizeItem(it);
      insertItem.run(makeId("sqi"), id, n.productId, n.productName, n.quantity, n.unitPrice, n.unitCost, n.source, n.supplierId, n.sqId, n.sqNumber);
    }
  });
  transaction();
};

const convertQuotation = (id) => {
  const quotation = db.prepare("SELECT * FROM sales_quotations WHERE id = ?").get(id);
  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status === "converted") throw new Error("Quotation already converted");

  const items = db.prepare("SELECT * FROM sales_quotation_items WHERE quote_id = ?").all(id);
  const purchaseOrderService = require("./purchaseOrderService");
  const today = nowIso().slice(0, 10);

  // Existing PO coverage — never re-order lines that are already sourced.
  const preCovered = [];

  if (quotation.enquiry_id) {
    const enquiry = db.prepare("SELECT po_id, po_ids, status FROM enquiries WHERE id = ?").get(quotation.enquiry_id);
    if (enquiry && enquiry.status === "confirmed") {
      if (enquiry.po_id) preCovered.push(enquiry.po_id);
      if (enquiry.po_ids) {
        try {
          const arr = JSON.parse(enquiry.po_ids);
          if (Array.isArray(arr)) arr.forEach((p) => preCovered.push(p));
        } catch (e) { /* ignore */ }
      }
    }
  }

  const bySupplier = {};
  const missingSupplier = [];

  for (const it of items) {
    if (String(it.source) !== "procurement") continue;

    // Line tied to an approved supplier quote that already produced a PO -> covered.
    if (it.sq_id) {
      const sq = db.prepare("SELECT po_id FROM supplier_quotes WHERE id = ?").get(it.sq_id);
      if (sq && sq.po_id) { preCovered.push(sq.po_id); continue; }
    }
    // Lead already confirmed with PO(s) -> covered.
    if (quotation.enquiry_id) {
      const enquiry = db.prepare("SELECT po_id, po_ids, status FROM enquiries WHERE id = ?").get(quotation.enquiry_id);
      if (enquiry && enquiry.status === "confirmed" && (enquiry.po_id || enquiry.po_ids)) {
        if (enquiry.po_id) preCovered.push(enquiry.po_id);
        try {
          const arr = JSON.parse(enquiry.po_ids || "[]");
          if (Array.isArray(arr)) arr.forEach((p) => preCovered.push(p));
        } catch (e) { /* ignore */ }
        continue;
      }
    }

    if (!it.supplier_id) {
      missingSupplier.push(it.product_name || it.product_id || "Item");
      continue;
    }

    (bySupplier[it.supplier_id] = bySupplier[it.supplier_id] || []).push(it);
  }

  if (missingSupplier.length) {
    throw new Error(`Cannot convert: procurement items need a supplier assigned — ${missingSupplier.join(", ")}`);
  }

  const createdPos = [];

  const transaction = db.transaction(() => {
    for (const [supplierId, lines] of Object.entries(bySupplier)) {
      const poItems = lines.map((it) => {
        let unitCost = 0;
        if (it.sq_id) {
          const sq = db.prepare("SELECT id FROM supplier_quotes WHERE id = ?").get(it.sq_id);
          if (sq) {
            const sqItems = db.prepare("SELECT * FROM supplier_quote_items WHERE quote_id = ?").all(sq.id);
            const sqItem = sqItems.find((x) =>
              (x.product_id && it.product_id && String(x.product_id) === String(it.product_id)) ||
              String(x.product_name || "").trim().toLowerCase() === String(it.product_name || "").trim().toLowerCase()
            );
            if (sqItem) unitCost = Number(sqItem.unit_cost) || 0;
          }
        }
        if (!unitCost) {
          const raw = Number(it.unit_cost) || 0;
          // Enquiry-sourced quotations store cost as a line total; composer ones store per-unit.
          unitCost = quotation.enquiry_id ? Math.round(raw / Math.max(1, Number(it.quantity) || 1)) : raw;
        }
        return {
          productId: it.product_id || null,
          productName: it.product_name || "Product",
          quantity: Number(it.quantity) || 1,
          unitCost
        };
      });

      const po = purchaseOrderService.createPurchaseOrder({
        supplierId,
        poDate: today,
        notes: `From quotation ${quotation.quote_number} (${quotation.customer_name})`,
        items: poItems,
        serviceRequestId: quotation.service_request_id || null
      });
      createdPos.push(po);
    }

    const allPoIds = [...new Set([...createdPos.map((p) => p.id), ...preCovered])];
    db.prepare("UPDATE sales_quotations SET status = 'converted', converted_at = ?, po_ids = ? WHERE id = ?")
      .run(nowIso(), allPoIds.length ? JSON.stringify(allPoIds) : null, id);
  });
  transaction();

  return { poIds: createdPos.map((p) => p.id), poNumbers: createdPos.map((p) => p.poNumber), preCovered };
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

// Keep the Sales Quotations module in sync with quotes prepared inside the Leads (enquiry) module.
// Creates the first quotation, then updates it in place on re-sends so the lead never accumulates duplicates.
const upsertQuotationFromEnquiry = (enquiry, options, actorName, validUntil) => {
  if (!enquiry || !Array.isArray(options) || !options.length) return null;

  const validUntilValue = validUntil || enquiry.valid_until || null;
  const items = options.map(o => ({
    productId: o.productId || null,
    productName: String(o.name || o.productName || "Product").trim() || "Product",
    quantity: Number(o.quantity) || 1,
    unitPrice: Number(o.quotedPrice) || 0,
    unitCost: Number(o.costPrice) || 0,
    source: o.source === "procurement" ? "procurement" : "inventory",
    supplierId: o.supplierId || null,
    sqId: o.sqId || null,
    sqNumber: o.sqNumber || null
  }));
  const total = items.reduce((s, it) => s + (it.quantity * it.unitPrice), 0);
  const existing = getByEnquiryId(enquiry.id);

  const transaction = db.transaction(() => {
    if (existing) {
      db.prepare(`UPDATE sales_quotations SET customer_name = ?, customer_mobile = ?, customer_address = ?, quote_date = ?, valid_until = ?, total_amount = ?, notes = ?, service_request_id = ? WHERE id = ?`)
        .run(
          String(enquiry.customer_name).trim(),
          enquiry.customer_mobile || null,
          enquiry.visit_address || null,
          nowIso().slice(0, 10),
          validUntilValue,
          total,
          enquiry.notes || null,
          enquiry.service_request_id || null,
          existing.id
        );
      db.prepare("DELETE FROM sales_quotation_items WHERE quote_id = ?").run(existing.id);
      const insertItem = db.prepare(`INSERT INTO sales_quotation_items (id, quote_id, product_id, product_name, quantity, unit_price, unit_cost, source, supplier_id, sq_id, sq_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const it of items) insertItem.run(makeId("sqi"), existing.id, it.productId, it.productName, it.quantity, it.unitPrice, it.unitCost, it.source, it.supplierId, it.sqId, it.sqNumber);
      return { id: existing.id, quoteNumber: existing.quote_number, action: "updated" };
    }

    const id = makeId("squot");
    const quoteNumber = getQuoteSeq();
    db.prepare(`INSERT INTO sales_quotations (id, quote_number, customer_name, customer_mobile, customer_address, quote_date, valid_until, total_amount, status, notes, created_by, created_at, service_request_id, enquiry_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`)
      .run(
        id,
        quoteNumber,
        String(enquiry.customer_name).trim(),
        enquiry.customer_mobile || null,
        enquiry.visit_address || null,
        nowIso().slice(0, 10),
        validUntilValue,
        total,
        enquiry.notes || null,
        actorName,
        nowIso(),
        enquiry.service_request_id || null,
        enquiry.id
      );
    const insertItem = db.prepare(`INSERT INTO sales_quotation_items (id, quote_id, product_id, product_name, quantity, unit_price, unit_cost, source, supplier_id, sq_id, sq_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const it of items) insertItem.run(makeId("sqi"), id, it.productId, it.productName, it.quantity, it.unitPrice, it.unitCost, it.source, it.supplierId, it.sqId, it.sqNumber);
    return { id, quoteNumber, action: "created" };
  });
  return transaction();
};

module.exports = {
  getQuotations,
  getQuotationById,
  getByServiceRequest,
  getByEnquiryId,
  createQuotation,
  updateQuotation,
  convertQuotation,
  deleteQuotation,
  upsertQuotationFromEnquiry
};
