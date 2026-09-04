const emailService = require("../services/emailService");
const pdfService = require("../services/pdfService");
const { db } = require("../../db");
const { formatCurrencyValue, formatDateValue } = require("../utils/helpers");

const streamToBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => reject(err));
  });
};

const sendServiceBillEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail } = req.body;

    const request = db.prepare("SELECT * FROM service_requests WHERE id = ?").get(id);
    if (!request) return res.status(404).json({ error: "Service request not found" });

    // Auto-lookup email from parties or users table if not provided
    let targetEmail = String(recipientEmail || "").trim() || request.customer_email;
    if (!targetEmail && request.customer_mobile) {
      const party = db.prepare("SELECT email FROM parties WHERE mobile = ? AND email IS NOT NULL AND email != '' LIMIT 1").get(request.customer_mobile);
      if (party && party.email) targetEmail = party.email;
    }
    if (!targetEmail && request.customer_mobile) {
      const user = db.prepare("SELECT email FROM users WHERE mobile = ? AND email IS NOT NULL AND email != '' LIMIT 1").get(request.customer_mobile);
      if (user && user.email) targetEmail = user.email;
    }

    if (!targetEmail) {
      return res.status(400).json({ error: "No email address found for this customer. Please enter one when prompted." });
    }

    // Generate PDF buffer
    const pdfDoc = await pdfService.generateServiceBill(id);
    pdfDoc.end();
    const pdfBuffer = await streamToBuffer(pdfDoc);

    const billNo = request.bill_number || `BILL-${id.slice(-6)}`;
    const subject = `[TECHLAB] Bill Receipt #${billNo} - ${request.device_type}`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #10284f; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px;">
        <h2 style="color: #1663ff; margin-bottom: 5px;">TECHLAB</h2>
        <p style="font-size: 12px; color: #6b7280; margin-top: 0;">Computers, Laptops, CCTV & IT Solutions</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

        <p>Dear <strong>${request.customer_name}</strong>,</p>
        <p>Thank you for choosing TECHLAB for your service needs. Please find attached the official bill for your recent service request.</p>

        <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0;">
          <p style="margin: 5px 0; font-size: 14px;"><strong>Bill Number:</strong> ${billNo}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Device / Service:</strong> ${request.device_type}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${formatDateValue(request.bill_date || request.created_at)}</p>
          <p style="margin: 5px 0; font-size: 16px; color: #1663ff;"><strong>Total Amount:</strong> ${formatCurrencyValue(request.bill_amount || 0)}</p>
        </div>

        <p>If you have any questions, feel free to reply to this email or call us at <strong>+91 94888-0-9897</strong>.</p>
        <br />
        <p style="font-size: 12px; color: #9ca3af;">Warm regards,<br /><strong>TECHLAB Team</strong><br />Casa Layout, Karur - 639001, Tamil Nadu</p>
      </div>
    `;

    await emailService.sendEmail({
      to: targetEmail,
      subject,
      html,
      attachments: [
        {
          filename: `Bill-${billNo}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]
    });

    res.json({ message: `Bill emailed successfully to ${targetEmail}` });
  } catch (err) {
    console.error("Email Service Bill Error:", err);
    res.status(500).json({ error: err.message || "Failed to send email" });
  }
};

const sendOrderInvoiceEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail } = req.body;

    const order = db.prepare("SELECT * FROM product_orders WHERE id = ?").get(id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Auto-lookup email from parties or users table if not provided
    let targetEmail = String(recipientEmail || "").trim();
    if (!targetEmail && order.customer_mobile) {
      const party = db.prepare("SELECT email FROM parties WHERE mobile = ? AND email IS NOT NULL AND email != '' LIMIT 1").get(order.customer_mobile);
      if (party && party.email) targetEmail = party.email;
    }
    if (!targetEmail && order.customer_mobile) {
      const user = db.prepare("SELECT email FROM users WHERE mobile = ? AND email IS NOT NULL AND email != '' LIMIT 1").get(order.customer_mobile);
      if (user && user.email) targetEmail = user.email;
    }

    if (!targetEmail) {
      return res.status(400).json({ error: "No email address found for this customer. Please enter one when prompted." });
    }

    const pdfDoc = await pdfService.generateOrderInvoice(id);
    pdfDoc.end();
    const pdfBuffer = await streamToBuffer(pdfDoc);

    const invNo = `INV-${order.id.slice(-6).toUpperCase()}`;
    const subject = `[TECHLAB] Tax Invoice #${invNo}`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #10284f; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px;">
        <h2 style="color: #1663ff; margin-bottom: 5px;">TECHLAB</h2>
        <p style="font-size: 12px; color: #6b7280; margin-top: 0;">Computers, Laptops, CCTV & IT Solutions</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

        <p>Dear <strong>${order.customer_name}</strong>,</p>
        <p>Thank you for your business! Please find attached your tax invoice for order <strong>#${order.id.slice(-6).toUpperCase()}</strong>.</p>

        <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0;">
          <p style="margin: 5px 0; font-size: 14px;"><strong>Invoice Ref:</strong> ${invNo}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${formatDateValue(order.created_at)}</p>
          <p style="margin: 5px 0; font-size: 16px; color: #1663ff;"><strong>Invoice Total:</strong> ${formatCurrencyValue(order.total_amount)}</p>
        </div>

        <p>If you need any further support, reply to this email or contact us at <strong>+91 94888-0-9897</strong>.</p>
        <br />
        <p style="font-size: 12px; color: #9ca3af;">Warm regards,<br /><strong>TECHLAB Team</strong></p>
      </div>
    `;

    await emailService.sendEmail({
      to: targetEmail,
      subject,
      html,
      attachments: [
        {
          filename: `Invoice-${invNo}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]
    });

    res.json({ message: `Invoice emailed successfully to ${targetEmail}` });
  } catch (err) {
    console.error("Email Order Invoice Error:", err);
    res.status(500).json({ error: err.message || "Failed to send email" });
  }
};

module.exports = {
  sendServiceBillEmail,
  sendOrderInvoiceEmail,
};
