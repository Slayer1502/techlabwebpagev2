const { db, makeId, nowIso } = require("../../db");
const { syncCustomerToParties } = require("./customerService");
const { applyOrderPayment } = require("./splitPaymentService");

const createEnquiryRecord = ({
  customerName,
  mobile,
  type,
  productInterest,
  visitAddress,
  preferredDate,
  budget,
  notes,
  supplierId,
  productId,
  quantity,
  costPrice,
  leadSource,
  followUpDate
}) => {
  syncCustomerToParties(customerName, mobile);
  const id = makeId("enquiry");
  db.prepare(`
    INSERT INTO enquiries (id, customer_name, customer_mobile, type, product_interest, visit_address, preferred_date, budget, status, notes, created_at, supplier_id, product_id, quantity, cost_price, lead_source, follow_up_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    customerName,
    mobile,
    type,
    productInterest || null,
    visitAddress || null,
    preferredDate || null,
    Number(budget) || null,
    notes || null,
    nowIso(),
    supplierId || null,
    productId || null,
    Number(quantity) || 1,
    Number(costPrice) || 0,
    leadSource || "Walk-in",
    followUpDate || null
  );
  return id;
};

const getEnquiries = (status) => {
  const base = `
    SELECT e.*, pt.name as supplier_name,
      (SELECT dc.total_value FROM delivery_challans dc WHERE dc.source_type = 'enquiry' AND dc.source_id = e.id LIMIT 1) as dc_total_value,
      (SELECT po.total_amount FROM product_orders po WHERE po.id = (SELECT dc.linked_order_id FROM delivery_challans dc WHERE dc.source_type = 'enquiry' AND dc.source_id = e.id LIMIT 1)) as order_total_amount
    FROM enquiries e
    LEFT JOIN parties pt ON e.supplier_id = pt.id
  `;
  const filter = status && status !== "all" ? `${base} WHERE e.status = ? ORDER BY e.created_at DESC`
                                             : `${base} ORDER BY e.created_at DESC`;
  return status && status !== "all" ? db.prepare(filter).all(status) : db.prepare(filter).all();
};

const getEnquiryById = (id) => {
  return db.prepare("SELECT * FROM enquiries WHERE id = ?").get(id);
};

const updateEnquiry = (id, data, updatedBy) => {
  const sets = [];
  const params = [];

  if (data.status) { sets.push("status = ?"); params.push(data.status); }
  if (data.notes !== undefined) { sets.push("notes = ?"); params.push(data.notes || null); }
  if (data.supplierId !== undefined) { sets.push("supplier_id = ?"); params.push(data.supplierId || null); }
  if (data.costPrice !== undefined) { sets.push("cost_price = ?"); params.push(Number(data.costPrice) || 0); }
  if (data.quotedPrice !== undefined) { sets.push("quoted_price = ?"); params.push(Number(data.quotedPrice) || 0); }
  if (data.quantity !== undefined) { sets.push("quantity = ?"); params.push(Number(data.quantity) || 1); }
  if (data.productId !== undefined) { sets.push("product_id = ?"); params.push(data.productId || null); }
  if (data.quoteOptions !== undefined) {
    const arr = Array.isArray(data.quoteOptions) ? data.quoteOptions : [];
    sets.push("quote_options = ?");
    params.push(arr.length ? JSON.stringify(arr) : null);
    if (arr.length) {
      sets.push("quoted_price = ?");
      params.push(arr.reduce((s, l) => s + ((Number(l?.quotedPrice) || 0) * (Number(l?.quantity) || 1)), 0));
    }
  }
  if (data.validUntil !== undefined) { sets.push("valid_until = ?"); params.push(data.validUntil || null); }
  if (data.leadSource !== undefined) { sets.push("lead_source = ?"); params.push(data.leadSource || "Walk-in"); }
  const followUp = data.followUpDate !== undefined ? data.followUpDate : data.follow_up_date;
  if (followUp !== undefined) { sets.push("follow_up_date = ?"); params.push(followUp || null); }

  if (updatedBy) { sets.push("updated_by = ?"); params.push(updatedBy); }

  if (sets.length === 0) return;

  params.push(id);
  db.prepare(`UPDATE enquiries SET ${sets.join(", ")} WHERE id = ?`).run(...params);
};

const normalizeQuoteLine = (o) => ({
  productId: o.productId || null,
  name: String(o.name || o.product || '').trim(),
  source: o.source || (o.sqId || o.supplierId ? 'procurement' : 'inventory'),
  legacy: (o.source == null || o.source === '') && !o.sqId,
  supplierId: o.supplierId || null,
  supplierName: o.supplierName || null,
  costPrice: Number(o.costPrice) || 0,
  quotedPrice: Number(o.quotedPrice) || 0,
  quantity: Number(o.quantity) || 1,
  sqId: o.sqId || null,
  sqNumber: o.sqNumber || null,
  poId: o.poId || null,
  costSource: o.costSource === 'sq' ? 'sq' : 'manual'
});

const quoteEnquiry = (id, data, updatedBy) => {
  const options = Array.isArray(data.quoteOptions) ? data.quoteOptions.map(normalizeQuoteLine) : [];
  const firstOption = options.length ? options[0] : null;
  const firstProcured = options.find(o => o.source === 'procurement' && o.supplierId);
  const selSupplierId = firstProcured ? firstProcured.supplierId : (firstOption ? firstOption.supplierId : data.supplierId);
  const selCostPrice = firstOption ? firstOption.costPrice : (Number(data.costPrice) || 0);
  const selQuotedPrice = options.length ? options.reduce((s, o) => s + (Number(o.quotedPrice) * Number(o.quantity)), 0) : (Number(data.quotedPrice) || 0);
  const selQuantity = firstOption ? firstOption.quantity : (Number(data.quantity) || 1);
  const selProductId = firstOption ? firstOption.productId : data.productId;
  const selSqIds = options.filter(o => o.sqId).map(o => o.sqId);

  db.prepare(`
    UPDATE enquiries SET status = 'quoted', supplier_id = ?, cost_price = ?, quoted_price = ?, quantity = ?, product_id = ?, quote_options = ?, valid_until = COALESCE(?, valid_until), supplier_quote_id = ?, notes = COALESCE(?, notes), updated_by = ? WHERE id = ?
  `).run(
    selSupplierId || null,
    selCostPrice,
    selQuotedPrice,
    selQuantity,
    selProductId || null,
    options.length ? JSON.stringify(options) : null,
    data.validUntil || null,
    selSqIds.length ? JSON.stringify(selSqIds) : null,
    data.notes || null,
    updatedBy,
    id
  );
};

const confirmEnquiry = (id, advanceData, updatedBy) => {
  const enquiry = getEnquiryById(id);
  if (!enquiry) return { error: "Enquiry not found" };

  let options = [];
  try { options = enquiry.quote_options ? JSON.parse(enquiry.quote_options).map(normalizeQuoteLine) : []; } catch { options = []; }

  if (!options.length) {
    options = [{
      productId: enquiry.product_id,
      name: enquiry.product_interest || "Product",
      source: enquiry.supplier_id ? 'procurement' : 'inventory',
      supplierId: enquiry.supplier_id,
      supplierName: enquiry.supplier_name || null,
      costPrice: Number(enquiry.cost_price) || 0,
      quotedPrice: Number(enquiry.quoted_price) || 0,
      quantity: Number(enquiry.quantity) || 1,
      sqId: null,
      sqNumber: null,
      poId: null
    }];
  }

  const procuredLines = options.filter(o => o.source === 'procurement');
  const missing = [];
  for (const line of procuredLines) {
    if (!line.supplierId) { missing.push(`${line.name || 'Item'}: no supplier selected`); continue; }
    if (line.legacy) continue;
    if (!line.sqId) {
      if (!(Number(line.costPrice) > 0)) { missing.push(`${line.name || 'Item'}: supplier cost not entered yet`); }
      continue;
    }
    const sq = db.prepare("SELECT id, status, quote_number FROM supplier_quotes WHERE id = ?").get(line.sqId);
    if (!sq) { missing.push(`${line.name || 'Item'}: supplier quote not found`); }
    else if (sq.status !== 'approved') { missing.push(`${line.name || 'Item'}: ${line.sqNumber || sq.quote_number} not approved yet`); }
  }
  if (missing.length) return { error: "Cannot confirm — resolve requisitions first", missing };

  const purchaseOrderService = require("./purchaseOrderService");
  const bySupplier = {};
  for (const line of procuredLines) {
    const key = line.supplierId;
    (bySupplier[key] = bySupplier[key] || { supplierId: key, lines: [] }).lines.push(line);
  }

  const today = nowIso().slice(0, 10);
  const poIds = [];
  const poNumbers = [];

  const transaction = db.transaction(() => {
    for (const group of Object.values(bySupplier)) {
      const po = purchaseOrderService.createPurchaseOrder({
        supplierId: group.supplierId,
        poDate: today,
        notes: `From enquiry ${enquiry.id} (${enquiry.customer_name})`,
        items: group.lines.map(l => {
          const sq = l.sqId ? db.prepare("SELECT id, status FROM supplier_quotes WHERE id = ?").get(l.sqId) : null;
          const sqItems = sq ? db.prepare("SELECT * FROM supplier_quote_items WHERE quote_id = ?").all(sq.id) : [];
          const sqItem = sqItems.find(it =>
            (it.product_id && l.productId && String(it.product_id) === String(l.productId)) ||
            String(it.product_name || "").trim().toLowerCase() === String(l.name || "").trim().toLowerCase()
          );
          const unitCost = sqItem ? (Number(sqItem.unit_cost) || 0) : (Math.round((Number(l.costPrice) || 0) / (Number(l.quantity) || 1)) || 0);
          return {
            productId: l.productId,
            productName: l.name || "Product",
            quantity: l.quantity,
            unitCost
          };
        })
      });
      poIds.push(po.id);
      poNumbers.push(po.poNumber);
      for (const line of group.lines) line.poId = po.id;
    }

    const supplierAdv = Number(advanceData.supplierAdvanceAmount) || 0;
    const customerAdv = Number(advanceData.customerAdvanceAmount) || 0;

    db.prepare(`
        UPDATE enquiries
        SET status = 'confirmed', po_id = ?, po_ids = ?,
            advance_amount = ?, advance_mode = ?, advance_date = ?,
            customer_advance_amount = ?, customer_advance_mode = ?, customer_advance_date = ?,
            supplier_advance_amount = ?, supplier_advance_mode = ?, supplier_advance_date = ?,
            quote_options = ?, updated_by = ?
        WHERE id = ?
    `).run(
        poIds[0] || null,
        poIds.length ? JSON.stringify(poIds) : null,
        supplierAdv, advanceData.supplierAdvanceMode || "Cash", advanceData.supplierAdvanceDate || today,
        customerAdv, advanceData.customerAdvanceMode || "Cash", advanceData.customerAdvanceDate || today,
        supplierAdv, advanceData.supplierAdvanceMode || "Cash", advanceData.supplierAdvanceDate || today,
        JSON.stringify(options),
        updatedBy, id
    );
  });
  transaction();
  return { poId: poIds[0] || null, poIds, poNumbers };
};

const deliverEnquiry = (id, paymentData, updatedBy) => {
  const { received, mode, date } = paymentData;
  db.prepare("UPDATE enquiries SET status = 'delivered', final_received = ?, final_mode = ?, final_date = ?, updated_by = ? WHERE id = ?")
    .run(Number(received) || 0, mode || null, date || nowIso().slice(0, 10), updatedBy, id);
};

const recordPayment = (id, paymentData, updatedBy) => {
  const amount = Number(paymentData.received) || 0;
  const mode = paymentData.mode || "Cash";
  const date = paymentData.date || nowIso().slice(0, 10);

  const transaction = db.transaction(() => {
    db.prepare("UPDATE enquiries SET final_received = ?, final_mode = ?, final_date = ?, updated_by = ? WHERE id = ?")
      .run(amount, mode || null, date, updatedBy, id);

    // Cascade to the linked billed order (enquiry -> delivery challan -> product order)
    const link = db.prepare(
      "SELECT linked_order_id FROM delivery_challans WHERE source_type = 'enquiry' AND source_id = ? AND billing_status = 'billed' AND linked_order_id IS NOT NULL"
    ).get(id);
    if (link && amount > 0) {
      applyOrderPayment(link.linked_order_id, [
        { amount, paymentMode: mode, paymentDate: date },
      ]);
    }
  });

  transaction();
};

const deleteEnquiry = (id) => {
  db.prepare("DELETE FROM enquiries WHERE id = ?").run(id);
};

module.exports = {
  createEnquiryRecord,
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  quoteEnquiry,
  confirmEnquiry,
  deliverEnquiry,
  recordPayment,
  deleteEnquiry
};
