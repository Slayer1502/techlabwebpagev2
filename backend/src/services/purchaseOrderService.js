const { db, makeId, nowIso } = require("../../db");

const getPurchaseOrders = () => {
  return db.prepare(`
    SELECT po.*, pt.name as supplier_name,
      (SELECT COUNT(*) FROM purchase_order_items i WHERE i.po_id = po.id) as item_count
    FROM purchase_orders po
    LEFT JOIN parties pt ON po.supplier_id = pt.id
    ORDER BY po.po_date DESC, po.created_at DESC
  `).all();
};

const getPurchaseOrderById = (id) => {
  const purchaseOrder = db.prepare(`
    SELECT po.*, pt.name as supplier_name, e.advance_amount, e.advance_mode,
      e.supplier_advance_amount, e.supplier_advance_mode, e.supplier_advance_date,
      e.customer_advance_amount, e.customer_advance_mode, e.customer_advance_date
    FROM purchase_orders po
    LEFT JOIN parties pt ON po.supplier_id = pt.id
    LEFT JOIN enquiries e ON po.id = e.po_id
    WHERE po.id = ?
  `).get(id);
  if (!purchaseOrder) return null;
  const items = db.prepare("SELECT * FROM purchase_order_items WHERE po_id = ?").all(id);
  return { purchaseOrder, items };
};

const createPurchaseOrder = (data) => {
  const { supplierId, poDate, expectedDate, notes, items, serviceRequestId } = data;
  const id = makeId("po");
  const seq = db.prepare("SELECT COUNT(*) as c FROM purchase_orders").get().c + 1;
  const poNumber = `PO-${String(seq).padStart(4, "0")}`;
  const date = poDate || nowIso().slice(0, 10);
  const total = items.reduce((s, it) => s + (Number(it.quantity) * (Number(it.unitCost) || 0)), 0);

  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO purchase_orders (id, po_number, supplier_id, po_date, expected_date, notes, status, total_amount, service_request_id, created_at) VALUES (?, ?, ?, ?, ?, ?, 'ordered', ?, ?, ?)`)
      .run(id, poNumber, supplierId, date, expectedDate || null, notes || null, total, serviceRequestId || null, nowIso());
    const insertItem = db.prepare(`INSERT INTO purchase_order_items (id, po_id, product_id, product_name, quantity, unit_cost) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const it of items) {
      insertItem.run(makeId("poi"), id, it.productId || null, String(it.productName).trim(), Number(it.quantity), Number(it.unitCost) || 0);
    }
  });
  transaction();
  return { id, poNumber };
};

const receivePurchaseOrder = (id, body) => {
  const po = db.prepare("SELECT * FROM purchase_orders WHERE id = ?").get(id);
  if (!po) throw new Error("Purchase order not found");
  if (po.status === "received") throw new Error("This PO has already been received");
  if (po.status === "cancelled") throw new Error("Cannot receive a cancelled PO");

  const items = db.prepare("SELECT * FROM purchase_order_items WHERE po_id = ?").all(id);
  const date = nowIso().slice(0, 10);

  let advanceAmount = Number(body?.advanceAmount) || 0;
  let advanceMode = body?.advanceMode || "Cash";
  let advanceDate = body?.advanceDate || date;

  if (!advanceAmount) {
    const linkedEnquiry = db.prepare(`
      SELECT COALESCE(supplier_advance_amount, advance_amount) as adv,
             COALESCE(supplier_advance_mode, advance_mode) as adv_mode,
             COALESCE(supplier_advance_date, advance_date) as adv_date
      FROM enquiries WHERE po_id = ? AND COALESCE(supplier_advance_amount, advance_amount) > 0
    `).get(id);
    if (linkedEnquiry) {
      advanceAmount = Number(linkedEnquiry.adv) || 0;
      advanceMode = linkedEnquiry.adv_mode || "Cash";
      advanceDate = linkedEnquiry.adv_date || date;
    }
  }

  const transaction = db.transaction(() => {
    const createdPurchaseIds = [];
    const findProductByName = db.prepare("SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND active = 1 LIMIT 1");

    for (const it of items) {
      let pid = it.product_id;
      if (!pid) {
        const match = findProductByName.get(it.product_name);
        if (match) {
          pid = match.id;
        } else {
          pid = makeId("product");
          const price = Math.round((Number(it.unit_cost) || 0) * 1.5);
          db.prepare(`
            INSERT INTO products (id, type, name, price, description, discount_percent, active, stock, gst_rate, cost_price)
            VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?, ?)
          `).run(pid, "Accessory", String(it.product_name).trim(), price, `Automatically created from ${po.po_number}`, Number(it.quantity) || 1, 18, Math.round(Number(it.unit_cost) || 0));
        }
      }

      const newPurchaseId = makeId("purchase");
      const itemTotal = (Number(it.quantity) || 1) * (Number(it.unit_cost) || 0);
      db.prepare(`
        INSERT INTO purchases (id, supplier_id, product_name, product_id, quantity, unit_cost, total_cost, purchase_date, invoice_number, payment_status, payment_mode, payment_date, amount_paid, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newPurchaseId, po.supplier_id, it.product_name, pid,
        it.quantity, it.unit_cost, itemTotal, date, po.po_number,
        "pending", null, null, 0, `Received from ${po.po_number}`, nowIso()
      );

      createdPurchaseIds.push({ id: newPurchaseId, total: itemTotal });
      if (pid) {
        db.prepare("UPDATE products SET stock = stock + ?, cost_price = ? WHERE id = ?")
          .run(it.quantity, Math.round(Number(it.unit_cost) || 0), pid);
      }
    }

    if (advanceAmount > 0 && createdPurchaseIds.length) {
      const sum = createdPurchaseIds.reduce((s, x) => s + x.total, 0);
      let remainingAdvance = advanceAmount;
      createdPurchaseIds.forEach((p, i) => {
        let amt = i === createdPurchaseIds.length - 1 ? remainingAdvance : Math.round(advanceAmount * p.total / sum);
        amt = Math.max(0, Math.min(amt, p.total));
        const status = amt >= p.total ? "paid" : (amt > 0 ? "partial" : "pending");
        db.prepare("UPDATE purchases SET payment_status = ?, payment_mode = ?, payment_date = ?, amount_paid = ? WHERE id = ?")
          .run(status, advanceMode, advanceDate, amt, p.id);
        remainingAdvance -= amt;
      });
    }

    db.prepare("UPDATE purchase_orders SET status = 'received' WHERE id = ?").run(id);

    if (advanceAmount > 0) {
      const poStatus = advanceAmount >= po.total_amount ? "paid" : "partial";
      db.prepare("UPDATE purchase_orders SET amount_paid = ?, payment_status = ?, payment_mode = ?, payment_date = ? WHERE id = ?")
        .run(advanceAmount, poStatus, advanceMode, advanceDate, id);
    }

    if (po.service_request_id) {
      const request = db.prepare("SELECT requested_parts, part_request_status, buyout_requisition FROM service_requests WHERE id = ?").get(po.service_request_id);
      if (request) {
        let record = {};
        try { record = request.buyout_requisition ? JSON.parse(request.buyout_requisition) : {}; } catch { record = {}; }
        record.status = "received";
        record.poId = id;
        record.poNumber = po.po_number;
        db.prepare("UPDATE service_requests SET buyout_requisition = ? WHERE id = ?")
          .run(JSON.stringify(record), po.service_request_id);

        let parts = {};
        try { parts = request.requested_parts ? JSON.parse(request.requested_parts) : {}; } catch { parts = {}; }
        if (!Array.isArray(parts.inventory)) parts.inventory = [];
        const existingNames = new Set(parts.inventory.map((p) => String(p.name || "").trim().toLowerCase()));
        for (const it of items) {
          const nm = String(it.product_name || "").trim();
          if (!nm || existingNames.has(nm.toLowerCase())) continue;
          parts.inventory.push({ productId: it.product_id || null, name: nm, qty: it.quantity || 1, source: "buyout" });
          existingNames.add(nm.toLowerCase());
        }
        const nextStatus = (!request.part_request_status || request.part_request_status === "none" || request.part_request_status === "requested")
          ? "requested" : request.part_request_status;
        db.prepare("UPDATE service_requests SET requested_parts = ?, part_request_status = ? WHERE id = ?")
          .run(JSON.stringify(parts), nextStatus, po.service_request_id);
      }
    }
  });

  transaction();
  return { advanceAmount };
};

const recordPurchaseOrderPayment = (poId, data) => {
  const po = db.prepare("SELECT * FROM purchase_orders WHERE id = ?").get(poId);
  if (!po) throw new Error("Purchase order not found");
  if (po.status === "cancelled") throw new Error("Cannot record payment on a cancelled PO");
  if (po.status !== "received") throw new Error("Record payment after the PO has been received");

  const total = Number(po.total_amount) || 0;
  const alreadyPaid = Number(po.amount_paid) || 0;
  let amount = Math.round(Number(data.amount) || 0);
  if (!(amount > 0)) throw new Error("Payment amount must be at least 1");
  if (amount > total - alreadyPaid) throw new Error(`Payment amount exceeds balance (${total - alreadyPaid})`);

  const newPaid = alreadyPaid + amount;
  const status = newPaid >= total ? "paid" : "partial";

  const transaction = db.transaction(() => {
    db.prepare("UPDATE purchase_orders SET amount_paid = ?, payment_status = ?, payment_mode = ?, payment_date = ? WHERE id = ?")
      .run(newPaid, status, data.paymentMode || "Cash", data.paymentDate || nowIso().slice(0, 10), poId);

    const items = db.prepare("SELECT id, total_cost, amount_paid FROM purchases WHERE invoice_number = ?").all(po.po_number);
    const sum = items.reduce((s, x) => s + (x.total_cost || 0), 0);
    if (sum > 0) {
      let remaining = newPaid;
      items.forEach((it, i) => {
        let amt = i === items.length - 1 ? remaining : Math.round(newPaid * (it.total_cost || 0) / sum);
        amt = Math.max(0, Math.min(amt, it.total_cost || 0));
        const itemStatus = amt >= (it.total_cost || 0) ? "paid" : (amt > 0 ? "partial" : "pending");
        db.prepare("UPDATE purchases SET amount_paid = ?, payment_status = ?, payment_mode = ?, payment_date = ? WHERE id = ?")
          .run(amt, itemStatus, data.paymentMode || "Cash", data.paymentDate || nowIso().slice(0, 10), it.id);
        remaining -= amt;
      });
    }
  });
  transaction();
  return { amount_paid: newPaid, balance: total - newPaid, payment_status: status };
};

const backfillPurchaseOrderPayments = () => {
  const pos = db.prepare("SELECT * FROM purchase_orders WHERE status = 'received'").all();
  let updated = 0;
  for (const po of pos) {
    const rows = db.prepare("SELECT total_cost, amount_paid, payment_mode, payment_date FROM purchases WHERE invoice_number = ?").all(po.po_number);
    const paid = rows.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0);
    if (paid > 0) {
      const status = paid >= (po.total_amount || 0) ? "paid" : "partial";
      const mode = rows.find(r => r.payment_mode)?.payment_mode || null;
      const date = rows.find(r => r.payment_date)?.payment_date || null;
      db.prepare("UPDATE purchase_orders SET amount_paid = ?, payment_status = ?, payment_mode = ?, payment_date = ? WHERE id = ?")
        .run(paid, status, mode, date, po.id);
      updated++;
    }
  }
  return updated;
};

const deletePurchaseOrder = (id, force) => {
  const po = db.prepare("SELECT id, status, po_number FROM purchase_orders WHERE id = ?").get(id);
  if (!po) throw new Error("Purchase order not found");

  if (po.status === "received" && !force) {
    const linkedPurchases = db.prepare("SELECT COUNT(*) as count FROM purchases WHERE invoice_number = ? OR notes LIKE ?")
      .get(po.po_number, `%${po.po_number}%`).count;

    if (linkedPurchases > 0) {
      const err = new Error("This PO has been received and has linked purchase records.");
      err.requiresForce = true;
      err.linkedPurchases = linkedPurchases;
      throw err;
    }
  }

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM purchase_order_items WHERE po_id = ?").run(id);
    db.prepare("DELETE FROM purchase_orders WHERE id = ?").run(id);
  });
  transaction();
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  receivePurchaseOrder,
  recordPurchaseOrderPayment,
  backfillPurchaseOrderPayments,
  deletePurchaseOrder
};
