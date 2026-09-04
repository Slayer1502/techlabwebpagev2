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
    SELECT po.*, pt.name as supplier_name, e.advance_amount, e.advance_mode
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
  const { supplierId, poDate, expectedDate, notes, items } = data;
  const id = makeId("po");
  const seq = db.prepare("SELECT COUNT(*) as c FROM purchase_orders").get().c + 1;
  const poNumber = `PO-${String(seq).padStart(4, "0")}`;
  const date = poDate || nowIso().slice(0, 10);
  const total = items.reduce((s, it) => s + (Number(it.quantity) * (Number(it.unitCost) || 0)), 0);

  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO purchase_orders (id, po_number, supplier_id, po_date, expected_date, notes, status, total_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, 'ordered', ?, ?)`)
      .run(id, poNumber, supplierId, date, expectedDate || null, notes || null, total, nowIso());
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
    const linkedEnquiry = db.prepare("SELECT advance_amount, advance_mode, advance_date FROM enquiries WHERE po_id = ? AND advance_amount > 0").get(id);
    if (linkedEnquiry) {
      advanceAmount = Number(linkedEnquiry.advance_amount) || 0;
      advanceMode = linkedEnquiry.advance_mode || "Cash";
      advanceDate = linkedEnquiry.advance_date || date;
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
            INSERT INTO products (id, type, name, price, description, discount_percent, active, stock, gst_rate)
            VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)
          `).run(pid, "Accessory", String(it.product_name).trim(), price, `Automatically created from ${po.po_number}`, Number(it.quantity) || 1, 18);
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
        db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(it.quantity, pid);
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
  });

  transaction();
  return { advanceAmount };
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
  deletePurchaseOrder
};
