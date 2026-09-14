const { db, makeId, nowIso } = require("../../db");
const { syncCustomerToParties } = require("./customerService");
const { deductStock, returnStock } = require("./productService");

const buildChallanItems = (sourceType, sourceId, explicitItems) => {
  if (explicitItems && Array.isArray(explicitItems) && explicitItems.length) {
    let customerName = "";
    let customerMobile = "";
    let customerAddress = "";
    if (sourceType === "order") {
      const order = db.prepare("SELECT customer_name, customer_mobile, customer_address FROM product_orders WHERE id = ?").get(sourceId);
      if (order) {
        customerName = order.customer_name || "";
        customerMobile = order.customer_mobile || "";
        customerAddress = order.customer_address || "";
      }
    } else if (sourceType === "service") {
      const req = db.prepare("SELECT customer_name, customer_mobile FROM service_requests WHERE id = ?").get(sourceId);
      if (req) {
        customerName = req.customer_name || "";
        customerMobile = req.customer_mobile || "";
      }
    } else if (sourceType === "enquiry") {
      const enq = db.prepare("SELECT customer_name, customer_mobile, visit_address FROM enquiries WHERE id = ?").get(sourceId);
      if (enq) {
        customerName = enq.customer_name || "";
        customerMobile = enq.customer_mobile || "";
        customerAddress = enq.visit_address || "";
      }
    }
    return {
      hasExplicitItems: true,
      customer_name: customerName,
      customer_mobile: customerMobile,
      customer_address: customerAddress,
      items: explicitItems.map((i) => ({
        productId: i.productId || i.product_id || null,
        name: String((i.name || i.item || "").trim()) || "Item",
        qty: Number(i.qty) || 1,
        price: Number(i.rate ?? i.price ?? i.customPrice) || 0,
      })),
    };
  }
  if (sourceType === "order") {
    const order = db.prepare("SELECT * FROM product_orders WHERE id = ?").get(sourceId);
    if (!order) return null;
    const items = db.prepare("SELECT product_name, price, qty FROM order_items WHERE order_id = ?").all(sourceId);
    return {
      customer_name: order.customer_name,
      customer_mobile: order.customer_mobile,
      customer_address: order.customer_address || "",
      items: items.map(i => ({ name: i.product_name, qty: i.qty || 1, price: i.price })),
    };
  }
  if (sourceType === "enquiry") {
    const enq = db.prepare("SELECT * FROM enquiries WHERE id = ?").get(sourceId);
    if (!enq) return null;
    let items = [];
    if (enq.quote_options) {
      try {
        const opts = JSON.parse(enq.quote_options);
        if (Array.isArray(opts)) {
          items = opts
            .map(o => ({
              name: String(o.name || enq.product_interest || "Item").trim(),
              qty: Number(o.quantity) || 1,
              price: Number(o.quotedPrice) || 0,
              productId: o.productId || null,
            }))
            .filter(i => i.name);
        }
      } catch (e) {}
    }
    if (!items.length) {
      items = [{
        name: String(enq.product_interest || "Product").trim() || "Item",
        qty: Number(enq.quantity) || 1,
        price: Number(enq.quoted_price) || 0,
        productId: enq.product_id || null,
      }];
    }
    return {
      customer_name: enq.customer_name,
      customer_mobile: enq.customer_mobile,
      customer_address: enq.visit_address || "",
      items: items,
    };
  }
  if (sourceType === "service") {
    const req = db.prepare("SELECT * FROM service_requests WHERE id = ?").get(sourceId);
    if (!req) return null;
    let items = [];
    if (req.used_items) {
      try {
        const used = JSON.parse(req.used_items);
        if (Array.isArray(used)) items = used
          .filter(u => String(u.type || "").toLowerCase() !== "service")
          .map(u => ({
            name: String(u.name || "").trim(),
            qty: Number(u.qty) || 1,
            price: Number(u.price) || 0,
            productId: u.product_id || u.productId || null,
          }))
          .filter(i => i.name);
      } catch (e) {}
    }
    if (!items.length && req.requested_parts) {
      try {
        const parts = JSON.parse(req.requested_parts);
        if (parts && Array.isArray(parts.inventory)) {
          items = parts.inventory.map(p => ({
            name: String(p.name || "").trim(),
            qty: Number(p.qty) || 1,
            price: 0,
            productId: p.product_id || p.productId || null,
          })).filter(i => i.name);
        }
      } catch (e) {}
    }
    return {
      customer_name: req.customer_name,
      customer_mobile: req.customer_mobile,
      customer_address: "",
      items: items,
    };
  }
  return null;
};

const createOrUpdateChallan = (data, userId) => {
  const { sourceType, sourceId, challanId, items: explicitItems, dispatchDate, receiverName, transport, vehicleNo, notes } = data;
  const type = String(sourceType || "").toLowerCase();

  const source = buildChallanItems(type, String(sourceId), explicitItems);
  if (!source) throw new Error(type === "order" ? "Order not found" : type === "enquiry" ? "Enquiry not found" : "Service request not found");

  let existing = null;
  if (challanId) {
    existing = db.prepare("SELECT * FROM delivery_challans WHERE id = ?").get(String(challanId));
  }

  const dispatchDateValue = String(dispatchDate || "").slice(0, 10) || nowIso().slice(0, 10);
  const customerName = source.customer_name || (existing ? existing.customer_name : data.customerName);
  const customerMobile = source.customer_mobile || (existing ? existing.customer_mobile : data.customerMobile);
  const customerAddress = source.customer_address || (existing ? existing.customer_address : "");
  const receiver = String(receiverName || "").trim() || customerName;

  const transaction = db.transaction(() => {
    let challanIdOut;
    let challanNumber;
    const totalValue = source.items.reduce((sum, it) => sum + (it.qty * (it.price || 0)), 0);

    if (existing) {
      challanIdOut = existing.id;
      challanNumber = existing.challan_number;
      db.prepare(`
        UPDATE delivery_challans
        SET dispatch_date = ?, receiver_name = ?, transport = ?, vehicle_no = ?, notes = ?,
            customer_name = ?, customer_mobile = ?, customer_address = ?, total_value = ?
        WHERE id = ?
      `).run(dispatchDateValue, receiver, transport || null, vehicleNo || null, notes || null, customerName, customerMobile, customerAddress, totalValue, challanIdOut);
      db.prepare("DELETE FROM delivery_challan_items WHERE challan_id = ?").run(challanIdOut);
    } else {
      challanIdOut = makeId("challan");
      challanNumber = `DC-${challanIdOut}`;
      db.prepare(`
        INSERT INTO delivery_challans (id, challan_number, source_type, source_id, customer_name, customer_mobile, customer_address, dispatch_date, receiver_name, transport, vehicle_no, notes, created_by, created_at, total_value)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(challanIdOut, challanNumber, type, String(sourceId), customerName, customerMobile, customerAddress, dispatchDateValue, receiver, transport || null, vehicleNo || null, notes || null, userId, nowIso(), totalValue);
    }

    const insertItem = db.prepare("INSERT INTO delivery_challan_items (challan_id, item_name, qty, unit_price, total_price) VALUES (?, ?, ?, ?, ?)");
    source.items.forEach(item => {
      const unitPrice = item.price || 0;
      insertItem.run(challanIdOut, item.name, item.qty, unitPrice, item.qty * unitPrice);
    });

    if (type === "service" && source.items.some(i => i.productId)) {
      const wasDeducted = existing ? (existing.stock_deducted === 1) : false;
      if (!wasDeducted) {
        source.items.forEach(item => {
          if (item.productId) deductStock(item.productId, item.qty);
        });
        db.prepare("UPDATE delivery_challans SET stock_deducted = 1 WHERE id = ?").run(challanIdOut);
      }
    }

    return { challanId: challanIdOut, challanNumber, dispatchDateValue, receiver, items: source.items };
  });

  return transaction();
};

const getChallans = (filters) => {
  const { sourceType, sourceId, billingStatus, customerMobile, customerName } = filters;

  if (sourceType && sourceId) {
    const type = String(sourceType).toLowerCase();
    const challan = db.prepare("SELECT * FROM delivery_challans WHERE source_type = ? AND source_id = ? ORDER BY created_at DESC, id DESC LIMIT 1").get(type, String(sourceId));
    if (!challan) return null;
    const items = db.prepare("SELECT id, item_name, qty, unit_price, total_price FROM delivery_challan_items WHERE challan_id = ? ORDER BY id").all(challan.id);
    return { ...challan, items };
  }

  let query = "SELECT * FROM delivery_challans WHERE 1=1";
  const params = [];

  if (billingStatus) {
    query += " AND billing_status = ?";
    params.push(billingStatus);
  }

  if (customerMobile) {
    query += " AND customer_mobile = ?";
    params.push(customerMobile);
  } else if (customerName) {
    query += " AND customer_name = ?";
    params.push(customerName);
  }

  query += " ORDER BY created_at DESC";

  return db.prepare(query).all(...params);
};

const createStandaloneChallan = (data, userId) => {
  const { customerName, mobile, items, dispatchDate, receiverName, transport, vehicleNo, notes } = data;

  syncCustomerToParties(customerName, mobile);

  const dispatchDateValue = String(dispatchDate || "").slice(0, 10) || nowIso().slice(0, 10);
  const id = makeId("challan");
  const challanNumber = `DC-${id}`;
  const totalValue = items.reduce((sum, item) => sum + (item.qty * (Number(item.customPrice) || 0)), 0);

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO delivery_challans (id, challan_number, source_type, source_id, customer_name, customer_mobile, dispatch_date, receiver_name, transport, vehicle_no, notes, created_by, created_at, billing_status, total_value)
      VALUES (?, ?, 'standalone', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(id, challanNumber, id, customerName, mobile, dispatchDateValue, receiverName || customerName, transport || null, vehicleNo || null, notes || null, userId, nowIso(), totalValue);

    const insertItem = db.prepare("INSERT INTO delivery_challan_items (challan_id, item_name, qty, unit_price, total_price) VALUES (?, ?, ?, ?, ?)");
    let droppedUnknown = false;
    items.forEach(item => {
      const unitPrice = Number(item.customPrice) || 0;
      const lineTotal = item.qty * unitPrice;

      const p = db.prepare("SELECT name, type FROM products WHERE id = ?").get(item.productId);
      const itemName = p ? p.name : "Unknown Item";
      insertItem.run(id, itemName, item.qty, unitPrice, lineTotal);

      if (p && p.type !== "Service") {
        deductStock(item.productId, item.qty);
      } else if (!p) {
        droppedUnknown = true;
      }
    });

    if (!droppedUnknown) {
      db.prepare("UPDATE delivery_challans SET stock_deducted = 1 WHERE id = ?").run(id);
    }
    return { id, challan_number: challanNumber };
  });

  return transaction();
};

const returnChallanItems = (challanId, returns) => {
  const dc = db.prepare("SELECT * FROM delivery_challans WHERE id = ?").get(challanId);
  if (!dc) throw new Error("Challan not found");
  if (dc.billing_status !== 'pending') throw new Error("Only unbilled challans can be adjusted");

  const transaction = db.transaction(() => {
    for (const [itemId, returnedQty] of Object.entries(returns)) {
      const item = db.prepare("SELECT * FROM delivery_challan_items WHERE id = ?").get(itemId);
      if (!item) continue;

      const returnAmt = Number(returnedQty);
      if (returnAmt <= 0) continue;
      if (returnAmt > item.qty) continue;

      const newUsedQty = item.qty - returnAmt;
      const newLineTotal = newUsedQty * item.unit_price;
      db.prepare("UPDATE delivery_challan_items SET qty = ?, total_price = ? WHERE id = ?")
        .run(newUsedQty, newLineTotal, itemId);

      const p = db.prepare("SELECT id FROM products WHERE name = ? AND active = 1").get(item.item_name);
      if (p) {
        returnStock(p.id, returnAmt);
      }
    }

    const newTotal = db.prepare("SELECT SUM(total_price) as t FROM delivery_challan_items WHERE challan_id = ?").get(challanId).t || 0;
    db.prepare("UPDATE delivery_challans SET total_value = ? WHERE id = ?").run(newTotal, challanId);
  });

  transaction();
};

const consolidateChallansToBill = (ids, isGst) => {
    const isGstBill = isGst === false ? 0 : 1;
    const challans = db.prepare(`SELECT * FROM delivery_challans WHERE id IN (${ids.map(() => "?").join(",")})`).all(...ids);
    if (challans.length !== ids.length) throw new Error("Some challans not found");

    const invalid = challans.find(c => c.billing_status !== 'pending');
    if (invalid) throw new Error(`Challan ${invalid.challan_number} is no longer unbilled`);

    const customerKeys = new Set(challans.map(c => c.customer_mobile || c.customer_name));
    if (customerKeys.size > 1) {
        throw new Error("All challans must belong to the same customer");
    }

    const firstDc = challans[0];
    const itemMap = new Map();

    ids.forEach(id => {
        const items = db.prepare("SELECT * FROM delivery_challan_items WHERE challan_id = ?").all(id);
        items.forEach(it => {
            const key = `${it.item_name}|${it.unit_price}`;
            if (itemMap.has(key)) {
                const existing = itemMap.get(key);
                existing.qty += it.qty;
            } else {
                const p = db.prepare("SELECT id FROM products WHERE name = ? AND active = 1").get(it.item_name);
                itemMap.set(key, {
                    productId: p ? p.id : null,
                    productName: it.item_name,
                    qty: it.qty,
                    customPrice: it.unit_price
                });
            }
        });
    });

    const allItems = Array.from(itemMap.values());
    const { createOrderForCustomer } = require("./orderService");

    const transaction = db.transaction(() => {
        const order = createOrderForCustomer({
            customerName: firstDc.customer_name,
            mobile: firstDc.customer_mobile,
            address: firstDc.customer_address || "",
            items: allItems,
            isGstBill: isGstBill,
            paymentStatus: 'pending',
            status: 'Payment Pending',
            createdAt: nowIso().slice(0, 10),
            skipStockDeduction: true
        });

        if (order.error) throw new Error(order.error);

        const updateDc = db.prepare("UPDATE delivery_challans SET billing_status = 'billed', linked_order_id = ? WHERE id = ?");
        ids.forEach(id => updateDc.run(order.orderId, id));

        return order.orderId;
    });

    return transaction();
};

const getChallanById = (id) => {
    const challan = db.prepare("SELECT * FROM delivery_challans WHERE id = ?").get(id);
    if (!challan) return null;
    const items = db.prepare("SELECT * FROM delivery_challan_items WHERE challan_id = ? ORDER BY id").all(id);
    return { ...challan, items };
};

const markDelivered = (challanId, userId, receivedBy) => {
  const dc = db.prepare("SELECT * FROM delivery_challans WHERE id = ?").get(challanId);
  if (!dc) throw new Error("Challan not found");
  if (dc.billing_status !== "pending") throw new Error("Only unbilled challans can be marked delivered");

  const receivedByVal = String(receivedBy || "").trim() || dc.receiver_name || dc.customer_name;
  db.prepare("UPDATE delivery_challans SET delivered_at = ?, received_by = ? WHERE id = ?")
    .run(nowIso(), receivedByVal, challanId);

  return { id: challanId, delivered_at: nowIso(), received_by: receivedByVal };
};

const voidChallan = (challanId, userId, voidReason) => {
  const dc = db.prepare("SELECT * FROM delivery_challans WHERE id = ?").get(challanId);
  if (!dc) throw new Error("Challan not found");
  if (dc.billing_status !== "pending") throw new Error("Only unbilled challans can be voided");

  const transaction = db.transaction(() => {
    if (dc.stock_deducted === 1) {
      const items = db.prepare("SELECT item_name, qty FROM delivery_challan_items WHERE challan_id = ?").all(challanId);
      items.forEach((item) => {
        const p = db.prepare("SELECT id FROM products WHERE name = ? AND active = 1").get(item.item_name);
        if (p) returnStock(p.id, item.qty);
      });
    }
    db.prepare("UPDATE delivery_challans SET billing_status = 'cancelled', void_reason = ?, voided_by = ?, voided_at = ? WHERE id = ?")
      .run(String(voidReason || "").trim() || null, userId, nowIso(), challanId);
  });

  transaction();
  return { id: challanId, billing_status: "cancelled" };
};

module.exports = {
  buildChallanItems,
  createOrUpdateChallan,
  getChallans,
  getChallanById,
  createStandaloneChallan,
  returnChallanItems,
  consolidateChallansToBill,
  markDelivered,
  voidChallan
};
