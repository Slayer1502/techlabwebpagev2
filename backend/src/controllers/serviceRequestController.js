const serviceRequestService = require("../services/serviceRequestService");
const enquiryService = require("../services/enquiryService");
const { db, nowIso } = require("../../db");
const { parseServiceRequestPayload } = require("../utils/validators");
const { isSiteVisitType, normalizeUsedItems } = require("../utils/helpers");
const surveyService = require("../services/surveyService");

const createPublicRequest = async (req, res) => {
  const { customerName, mobile } = req.body;
  const parsed = parseServiceRequestPayload(req.body);
  if (!customerName || !mobile || parsed.error) {
    return res.status(400).json({ error: "Missing required service request fields" });
  }

  serviceRequestService.createServiceRequestRecord({
    customerName,
    mobile,
    deviceType: parsed.value.deviceType,
    preferredDate: parsed.value.preferredDate,
    issue: parsed.value.issue,
    requestSubjectType: parsed.value.requestSubjectType,
    requestSubjectName: parsed.value.requestSubjectName,
  });

  const enquiryTypes = ["New Device Purchase", "New Installation (Site Visit)"];
  if (enquiryTypes.includes(parsed.value.deviceType)) {
    enquiryService.createEnquiryRecord({
      customerName,
      mobile,
      type: parsed.value.deviceType === "New Device Purchase" ? "Sales" : "Site Visit",
      productInterest: parsed.value.requestSubjectName || parsed.value.deviceType,
      preferredDate: parsed.value.preferredDate,
      notes: `Auto-generated from public service request. Issue: ${parsed.value.issue}`,
    });
  }

  return res.status(201).json({ message: "Service request submitted successfully" });
};

const createSalesRequest = async (req, res) => {
  const { customerName, customer_mobile: mobile, device_type: deviceType, issue, preferred_date: preferredDate, technicianId, technicianName, estimated_cost: estimatedCost, created_at: createdAt } = req.body;
  if (!customerName || !mobile || !deviceType || !issue || !preferredDate) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const assignedEmployeeId = technicianId || null;
  const assignedEmployeeName = technicianId && technicianName ? technicianName : null;
  const servicePerson = technicianName || null;
  const status = technicianId ? "Scheduled" : "Pending";

  const requestData = {
    customerName,
    mobile,
    deviceType,
    issue,
    preferredDate,
    assignedEmployeeId,
    assignedEmployeeName,
    servicePerson,
    status,
    estimatedCost: Number(estimatedCost) || 0,
    createdAt: createdAt || undefined,
  };
  serviceRequestService.createServiceRequestRecord(requestData);

  res.json({ message: "Service request created" });
};

const getRequestById = async (req, res) => {
  const request = serviceRequestService.getServiceRequestById(req.params.id);
  if (!request) {
    return res.status(404).json({ error: "Service request not found" });
  }
  res.json({ request });
};

const assignTechnician = async (req, res) => {
  const { id } = req.params;
  const { technicianId, technicianName } = req.body;

  if (!technicianId || !technicianName) {
    return res.status(400).json({ error: "Technician ID and name required" });
  }

  const request = serviceRequestService.getServiceRequestById(id);
  if (!request) {
    return res.status(404).json({ error: "Service request not found" });
  }

  serviceRequestService.assignTechnician(id, technicianId, technicianName);
  res.json({ message: "Technician assigned" });
};

const createCustomerRequest = async (req, res) => {
  const { id } = req.user;
  // We need getUserById helper here or move it to a service
  // For now I'll just use the service to get user info if needed,
  // or assume the user object in req has what we need.
  // Actually the original used getUserById.get(req.user.id)

  // Let's import the user helper from customerService or just use db for now
  const { db } = require("../../db");
  const customer = db.prepare("SELECT name, mobile FROM users WHERE id = ?").get(id);

  const parsed = parseServiceRequestPayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  serviceRequestService.createServiceRequestRecord({
    customerName: customer.name,
    mobile: customer.mobile,
    deviceType: parsed.value.deviceType,
    preferredDate: parsed.value.preferredDate,
    issue: parsed.value.issue,
    requestSubjectType: parsed.value.requestSubjectType,
    requestSubjectName: parsed.value.requestSubjectName,
  });

  return res.status(201).json({ message: "Service request submitted successfully" });
};

const jobComplete = async (req, res) => {
  const request = serviceRequestService.getServiceRequestById(req.params.id);
  if (!request) return res.status(404).json({ error: "Service request not found" });

  if (request.status === "Completed") return res.status(400).json({ error: "Job already completed" });

  const { actual_meter_usage, completed_at: completedAtReq, used_items: usedItems, conveyance_expense } = req.body;

  if (isSiteVisitType(request.device_type)) {
    if (request.survey_status !== "submitted" && request.survey_status !== "reviewed") {
      return res.status(400).json({ error: "No survey submitted for this service request" });
    }

    const survey = surveyService.getSurveyByRequestId(req.params.id);
    if (!survey) return res.status(404).json({ error: "Survey not found" });

    if (actual_meter_usage && typeof actual_meter_usage === 'object') {
      surveyService.updateCableMeters(survey.id, actual_meter_usage);
    }
  }

  const completedAt = String(completedAtReq || "").slice(0, 10) || nowIso().slice(0, 10);

  serviceRequestService.completeServiceRequest(req.params.id, {
    completedAt,
    usedItems: JSON.stringify(normalizeUsedItems(usedItems)),
    conveyanceExpense: Number(conveyance_expense) || 0
  });

  res.json({ message: "Job completed successfully" });
};

const updateJobProgress = async (req, res) => {
  const request = serviceRequestService.getServiceRequestById(req.params.id);
  if (!request) return res.status(404).json({ error: "Service request not found" });

  if (request.status === "Completed") return res.status(400).json({ error: "Cannot update a completed job" });

  const { used_items, conveyance_expense } = req.body;

  serviceRequestService.updateServiceRequestDraft(req.params.id, {
    usedItems: JSON.stringify(normalizeUsedItems(used_items)),
    conveyanceExpense: Number(conveyance_expense) || 0
  });

  res.json({ message: "Job progress updated successfully" });
};

const updateStatusNotes = async (req, res) => {
    const { notes } = req.body;
    const request = serviceRequestService.getServiceRequestById(req.params.id);
    if (!request) return res.status(404).json({ error: "Service request not found" });

    serviceRequestService.updateServiceRequestNotes(req.params.id, notes);
    res.json({ message: "Notes updated" });
};

const generateBill = async (req, res) => {
  const request = serviceRequestService.getServiceRequestById(req.params.id);
  if (!request) return res.status(404).json({ error: "Service request not found" });

  if (request.status !== "Completed") {
    return res.status(400).json({ error: "Can only generate bill for completed services" });
  }

  const { amount, details, taxableAmount, gstRate, billDate: requestedBillDate, items } = req.body;
  let billAmount = Number(amount) || 0;
  let billDetails = JSON.stringify(details || []);
  if (Array.isArray(items) && items.length) {
    const normalizedItems = items.map((it) => ({
      desc: String(it.desc || it.description || "").trim(),
      qty: Number(it.qty) || 1,
      rate: Number(it.rate) || 0,
      amount: Number(it.amount) || 0,
    })).filter((it) => it.desc || it.amount > 0);
    billDetails = JSON.stringify(normalizedItems);
    billAmount = normalizedItems.reduce((sum, it) => sum + it.amount, 0);
  }
  const billTaxable = taxableAmount != null ? Number(taxableAmount) : billAmount;
  const billGstRate = Number(gstRate ?? 18);
  const billCgst = billGstRate ? Math.round(billTaxable * billGstRate / 2 / 100) : 0;
  const billSgst = billGstRate ? Math.round(billTaxable * billGstRate / 2 / 100) : 0;
  const billGstTotal = billCgst + billSgst;
  const billDate = String(requestedBillDate || "").slice(0, 10) || String(request.completed_at || request.created_at || "").slice(0, 10) || nowIso().slice(0, 10);
  const billMonth = new Date(billDate + "T00:00:00Z").toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const billNumber = `${billMonth}-${billDate.slice(0, 4)}-${Math.random().toString(36).slice(2, 6)}`;

  serviceRequestService.generateBill(req.params.id, {
      billNumber, billDate, billAmount, billDetails, billTaxable, billCgst, billSgst, billGstTotal
  });

  res.json({ message: "Bill generated", billNumber, billDate, billAmount, taxableAmount: billTaxable, cgst: billCgst, sgst: billSgst, gstTotal: billGstTotal });
};

const recordPayment = async (req, res) => {
  const { amount, discount, paymentMode, paymentDate } = req.body;
  const request = serviceRequestService.getServiceRequestById(req.params.id);
  if (!request || request.bill_status !== "billed") {
    return res.status(404).json({ error: "Billed service request not found" });
  }

  const billAmount = Number(request.bill_amount) || 0;
  const alreadyPaid = Number(request.amount_paid) || 0;
  const existingDiscount = Number(request.discount_amount) || 0;
  const remaining = billAmount - alreadyPaid - existingDiscount;
  if (remaining <= 0) {
    return res.status(400).json({ error: "Nothing left to collect on this bill" });
  }

  let payAmount = Number(amount);
  if (!Number.isFinite(payAmount) || payAmount <= 0) payAmount = remaining;
  if (payAmount > remaining) payAmount = remaining;

  let discountAmount = Number(discount);
  if (!Number.isFinite(discountAmount) || discountAmount < 0) discountAmount = 0;
  if (discountAmount > remaining - payAmount) discountAmount = Math.max(0, remaining - payAmount);

  const newPaid = alreadyPaid + payAmount;
  const newDiscount = existingDiscount + discountAmount;
  const settled = newPaid + newDiscount >= billAmount;
  const status = settled ? "paid" : (newPaid > 0 || newDiscount > 0) ? "partial" : "pending";
  const paidAt = paymentDate || nowIso().slice(0, 10);

  const paymentId = `SP-${request.id}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;

  serviceRequestService.recordPayment(req.params.id, {
      payAmount, discountAmount, paymentMode, paidAt, newPaid, newDiscount, status, paymentId
  });

  const { formatCurrencyValue } = require("../utils/helpers");
  res.json({
    message: settled ? "Payment received in full" : `Payment of ${formatCurrencyValue(payAmount)}${discountAmount > 0 ? ` + discount ${formatCurrencyValue(discountAmount)}` : ''} received`,
    amount_paid: newPaid,
    discount_amount: newDiscount,
    bill_amount: billAmount,
    balance: billAmount - newPaid - newDiscount,
    payment_status: status
  });
};

const getPayments = async (req, res) => {
    const payments = serviceRequestService.getPayments(req.params.id);
    res.json({ payments });
};

module.exports = {
  createPublicRequest,
  createSalesRequest,
  getRequestById,
  assignTechnician,
  createCustomerRequest,
  jobComplete,
  generateBill,
  recordPayment,
  getPayments,
  updateJobProgress,
  updateStatusNotes
};
