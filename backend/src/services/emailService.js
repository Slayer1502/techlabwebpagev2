const nodemailer = require("nodemailer");
const { db } = require("../../db");

const getEmailConfig = () => {
  const rows = db.prepare("SELECT key, value FROM business_settings").all();
  const map = {};
  rows.forEach(r => map[r.key] = r.value);

  const gmailUser = map.gmail_user || process.env.GMAIL_USER || "techlabkarur@gmail.com";
  const gmailPass = map.gmail_app_password || process.env.GMAIL_APP_PASSWORD || "";
  const shopName = map.business_name || "TECHLAB";

  return { gmailUser, gmailPass, shopName };
};

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  const { gmailUser, gmailPass, shopName } = getEmailConfig();

  if (!gmailPass) {
    throw new Error("Gmail App Password not configured in Settings > Company");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const mailOptions = {
    from: `"${shopName}" <${gmailUser}>`,
    to,
    subject,
    html,
    attachments,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[EMAIL] Sent successfully to ${to}. MessageId: ${info.messageId}`);
  return info;
};

module.exports = {
  getEmailConfig,
  sendEmail,
};
