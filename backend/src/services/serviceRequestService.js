const { db, makeId, nowIso } = require("../../db");
const { syncCustomerToParties } = require("./customerService");
const slaService = require("./slaService");

const createServiceRequestRecord = ({
  customerName,
  mobile,
  deviceType,
  preferredDate,
  issue,
  requestSubjectType,
  requestSubjectName,
  assignedEmployeeId,
  assignedEmployeeName,
  servicePerson,
  status,
  estimatedCost,
  createdAt,
  deviceIntake,
}) => {
  syncCustomerToParties(customerName, mobile);
  const reqStatus = status || "Pending";
  const empId = assignedEmployeeId || "";
  const empName = assignedEmployeeName || "Pending assignment";
  const servPerson = servicePerson || "Not scheduled";
  const schedDate = reqStatus === "Scheduled" ? preferredDate : "";

  let intakeJson = null;
  let finalSubjectName = requestSubjectName || "";
  if (deviceIntake && typeof deviceIntake === "object") {
    intakeJson = JSON.stringify(deviceIntake);
    if (!finalSubjectName && deviceIntake.brand && deviceIntake.model) {
      finalSubjectName = `${deviceIntake.brand} ${deviceIntake.model}`;
    }
  }

  const id = makeId("service");
  db.prepare(`
    INSERT INTO service_requests (
      id, customer_name, customer_mobile, device_type, request_subject_type, request_subject_name, issue, preferred_date,
      assigned_employee_id, assigned_employee_name, service_person, scheduled_date, status, created_at, estimated_cost, device_intake
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `  ).run(
    id,
    customerName,
    mobile,
    deviceType,
    requestSubjectType || "general-service",
    finalSubjectName,
    issue,
    preferredDate,
    empId,
    empName,
    servPerson,
    schedDate,
    reqStatus,
    createdAt || nowIso().slice(0, 10),
    estimatedCost || 0,
    intakeJson
  );
  try {
    slaService.applySlaOnCreate(id, { deviceType, createdAt: createdAt || nowIso() });
  } catch (e) {}
  return id;
};

const getServiceRequestById = (id) => {
  const request = db.prepare(`
    SELECT r.*,
    (SELECT id FROM delivery_challans WHERE source_type = 'service' AND source_id = r.id ORDER BY created_at DESC, id DESC LIMIT 1) as linked_dc_id
    FROM service_requests r WHERE r.id = ?
  `).get(id);
  if (!request) return null;
  const dcList = db.prepare(
    "SELECT id FROM delivery_challans WHERE source_type = 'service' AND source_id = ? ORDER BY created_at ASC, id ASC"
  ).all(id).map((d) => d.id);
  request.linked_dc_ids = dcList;
  return request;
};

const listRequestsForLinking = (search = "", limit = 50) => {
  const like = `%${search}%`;
  return db.prepare(`
    SELECT id, customer_name, customer_mobile, device_type, issue, status, bill_status, bill_number, created_at
    FROM service_requests
    WHERE customer_name LIKE ? OR customer_mobile LIKE ? OR id LIKE ? OR issue LIKE ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(like, like, like, like, limit);
};

const getServiceRequestsByRole = (role, userId, mobile) => {
  if (role === "customer") {
    return db.prepare("SELECT * FROM service_requests WHERE customer_mobile = ? ORDER BY created_at DESC").all(mobile);
  }
  if (role === "technician") {
    return db.prepare("SELECT * FROM service_requests WHERE assigned_employee_id = ? ORDER BY created_at DESC").all(userId);
  }
  return db.prepare("SELECT * FROM service_requests ORDER BY created_at DESC").all();
};

const updateServiceRequestStatus = (id, status) => {
    db.prepare("UPDATE service_requests SET status = ? WHERE id = ?").run(status, id);
};

const assignTechnician = (id, technicianId, technicianName) => {
    db.prepare(`
        UPDATE service_requests
        SET assigned_employee_id = ?, assigned_employee_name = ?, service_person = ?, status = 'Scheduled'
        WHERE id = ?
    `).run(technicianId, technicianName, technicianName, id);
};

const completeServiceRequest = (id, data) => {
    db.prepare(`
        UPDATE service_requests
        SET status = 'Completed', part_request_status = 'collected', completed_at = ?, used_items = ?, conveyance_expense = ?
        WHERE id = ?
    `).run(data.completedAt, data.usedItems, data.conveyanceExpense, id);
};

const updateServiceRequestDraft = (id, data) => {
    db.prepare(`
        UPDATE service_requests
        SET used_items = ?, conveyance_expense = ?
        WHERE id = ?
    `).run(data.usedItems, data.conveyanceExpense, id);
};

const updateServiceRequestNotes = (id, notes) => {
    db.prepare("UPDATE service_requests SET status_notes = ? WHERE id = ?").run(notes, id);
};

const generateBill = (id, data) => {
    db.prepare(`
        UPDATE service_requests
        SET bill_status = 'billed', bill_number = ?, bill_date = ?, bill_amount = ?, bill_details = ?, payment_status = 'pending',
            taxable_amount = ?, cgst_total = ?, sgst_total = ?, gst_total = ?
        WHERE id = ?
    `).run(data.billNumber, data.billDate, data.billAmount, data.billDetails, data.billTaxable, data.billCgst, data.billSgst, data.billGstTotal, id);
};

const recordPayment = (id, data) => {
    const transaction = db.transaction(() => {
        if (data.payAmount > 0) {
            db.prepare(`
                INSERT INTO service_payments (id, service_request_id, amount, payment_mode, paid_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(data.paymentId, id, data.payAmount, data.paymentMode, data.paidAt, nowIso());
        }
        db.prepare(`
            UPDATE service_requests
            SET amount_paid = ?, discount_amount = ?, payment_status = ?, payment_mode = ?, payment_date = ?
            WHERE id = ?
        `).run(data.newPaid, data.newDiscount, data.status, data.paymentMode, data.paidAt, id);
    });
    transaction();
};

const getPayments = (id) => {
    return db.prepare("SELECT * FROM service_payments WHERE service_request_id = ? ORDER BY paid_at DESC").all(id);
};

const cancelServiceRequest = (id, reason) => {
    const cancelledPos = [];
    const cancelledQuotes = [];
    const rejectedQuotes = [];

    const transaction = db.transaction(() => {
        db.prepare(`
            UPDATE service_requests
            SET status = 'Canceled', cancel_reason = ?, canceled_at = ?, assigned_employee_id = NULL, assigned_employee_name = NULL, service_person = NULL, scheduled_date = NULL,
                part_request_status = 'none', buyout_requisition = NULL
            WHERE id = ?
        `).run(reason || "", nowIso(), id);

        // Cancel the purchase-order flow: any PO raised for this request that hasn't been received yet.
        const pos = db.prepare(`
            SELECT id, po_number, status FROM purchase_orders
            WHERE service_request_id = ? AND status NOT IN ('received', 'cancelled')
        `).all(id);
        for (const po of pos) {
            db.prepare(`
                UPDATE purchase_orders
                SET status = 'cancelled', notes = COALESCE(notes || ' ', '') || 'Cancelled with service request (' || ? || ')'
                WHERE id = ?
            `).run(reason ? `reason: ${reason}` : 'service cancelled', po.id);
            cancelledPos.push(po.po_number);
        }

        // Cancel pending sales quotations raised for this request.
        const quotes = db.prepare(`
            SELECT id, quote_number FROM sales_quotations
            WHERE service_request_id = ? AND status = 'pending'
        `).all(id);
        for (const q of quotes) {
            db.prepare("UPDATE sales_quotations SET status = 'cancelled' WHERE id = ?").run(q.id);
            cancelledQuotes.push(q.quote_number);
        }

        // Reject any supplier quotes still awaiting approval for this request.
        const pendingSq = db.prepare(`
            SELECT id, quote_number FROM supplier_quotes
            WHERE service_request_id = ? AND status = 'pending'
        `).all(id);
        for (const sq of pendingSq) {
            db.prepare("UPDATE supplier_quotes SET status = 'rejected' WHERE id = ?").run(sq.id);
            rejectedQuotes.push(sq.quote_number);
        }
    });
    transaction();

    return { cancelledPos, cancelledQuotes, rejectedQuotes };
};

const requestParts = (id, requestedParts) => {
    db.prepare(`
        UPDATE service_requests
        SET requested_parts = ?, part_request_status = 'requested'
        WHERE id = ?
    `).run(JSON.stringify(requestedParts), id);
};

const markPartsAvailable = (id) => {
    db.prepare(`
        UPDATE service_requests
        SET part_request_status = 'available'
        WHERE id = ?
    `).run(id);
};

const markPartsCollected = (id) => {
    db.prepare(`
        UPDATE service_requests
        SET part_request_status = 'collected'
        WHERE id = ?
    `).run(id);
};

module.exports = {
  createServiceRequestRecord,
  getServiceRequestById,
  listRequestsForLinking,
  getServiceRequestsByRole,
  updateServiceRequestStatus,
  assignTechnician,
  completeServiceRequest,
  updateServiceRequestDraft,
  updateServiceRequestNotes,
  generateBill,
  recordPayment,
  getPayments,
  cancelServiceRequest,
  requestParts,
  markPartsAvailable,
  markPartsCollected
};
