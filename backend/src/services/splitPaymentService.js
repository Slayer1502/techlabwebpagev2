const { db, nowIso } = require("../../db");

// Records a split payment across multiple modes for a service request or order.
// entries: [{amount, paymentMode, paymentDate}]
// Returns summary of the new totals.
const splitPaymentService = ({ entityType, entityId, entries, discount }) => {
  if (!Array.isArray(entries) || !entries.length) {
    throw new Error("entries array required");
  }
  entries = entries
    .map((e) => ({
      amount: Math.round(Number(e.amount) || 0),
      paymentMode: e.paymentMode || "Cash",
      paymentDate: (e.paymentDate || nowIso().slice(0, 10)).slice(0, 10),
    }))
    .filter((e) => e.amount > 0);

  const totalPaid = entries.reduce((s, e) => s + e.amount, 0);
  if (totalPaid <= 0) throw new Error("No positive payment amounts provided");

  const transaction = db.transaction(() => {
    if (entityType === "service") {
      const request = db.prepare("SELECT * FROM service_requests WHERE id = ?").get(entityId);
      if (!request) throw new Error("Service request not found");
      if (request.bill_status !== "billed") throw new Error("Service request not billed");

      const billAmount = Number(request.bill_amount) || 0;
      const alreadyPaid = Number(request.amount_paid) || 0;
      const existingDiscount = Number(request.discount_amount) || 0;
      const remaining = billAmount - alreadyPaid - existingDiscount;
      if (remaining <= 0) throw new Error("Nothing left to collect");

      let discountToApply = Number(discount) || 0;
      if (discountToApply < 0) discountToApply = 0;
      if (discountToApply > remaining) discountToApply = remaining;

      let applied = 0;
      const applicablePool = remaining - discountToApply;
      const insertPayment = db.prepare(
        "INSERT INTO service_payments (id, service_request_id, amount, payment_mode, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      );
      for (const e of entries) {
        const canApply = Math.min(e.amount, applicablePool - applied);
        if (canApply <= 0) continue;
        insertPayment.run(
          `SP-${entityId}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`,
          entityId,
          canApply,
          e.paymentMode,
          e.paidAt || e.paymentDate,
          nowIso()
        );
        applied += canApply;
      }
      const newPaid = alreadyPaid + applied;
      const newDiscount = existingDiscount + discountToApply;
      const settled = newPaid + newDiscount >= billAmount;
      const status = settled ? "paid" : (newPaid > 0 || newDiscount > 0) ? "partial" : "pending";
      db.prepare(
        "UPDATE service_requests SET amount_paid = ?, discount_amount = ?, payment_status = ?, payment_mode = ?, payment_date = ? WHERE id = ?"
      ).run(newPaid, newDiscount, status, entries[0].paymentMode, entries[0].paymentDate, entityId);
      return {
        entityType,
        billAmount,
        amountPaid: newPaid,
        discountAmount: newDiscount,
        balance: billAmount - newPaid - newDiscount,
        paymentStatus: status,
        received: applied,
        splits: entries.map((e) => ({ ...e, applied: Math.min(e.amount, Math.max(0, applicablePool - (applied - e.amount)) ) })),
      };
    }

    if (entityType === "order") {
      const order = db.prepare("SELECT * FROM product_orders WHERE id = ?").get(entityId);
      if (!order) throw new Error("Order not found");
      const totalAmount = Number(order.total_amount) || 0;
      const alreadyPaid = Number(order.amount_paid || 0);
      const remaining = totalAmount - alreadyPaid;
      if (remaining <= 0) throw new Error("Nothing left to collect");

      let applied = 0;
      const insertPayment = db.prepare(
        "INSERT INTO order_payments (id, order_id, amount, payment_mode, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      );
      for (const e of entries) {
        const canApply = Math.min(e.amount, remaining - applied);
        if (canApply <= 0) continue;
        insertPayment.run(
          `OP-${entityId}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`,
          entityId,
          canApply,
          e.paymentMode,
          e.paidAt || e.paymentDate,
          nowIso()
        );
        applied += canApply;
      }
      const newPaid = alreadyPaid + applied;
      const settled = newPaid >= totalAmount;
      const status = settled ? "paid" : newPaid > 0 ? "partial" : "pending";
      db.prepare(
        "UPDATE product_orders SET payment_status = ?, payment_mode = ?, payment_date = ? WHERE id = ?"
      ).run(status, entries[0].paymentMode, entries[0].paymentDate, entityId);
      return {
        entityType,
        totalAmount,
        amountPaid: newPaid,
        balance: totalAmount - newPaid,
        paymentStatus: status,
        received: applied,
      };
    }

    throw new Error("Unsupported entityType: " + entityType);
  });

  return transaction();
};

module.exports = { splitPaymentService };
