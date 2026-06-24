import nodemailer from "nodemailer";
import { decrypt } from "../lib/encryption.js";
import { formatSubmissionForDisplay } from "../lib/validation.js";
import { getFileBuffer } from "./storage.js";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function buildHtml({ formName, shopName, rows, submittedAt }) {
  const rowsHtml = rows
    .map(
      (row) =>
        `<tr><td style="padding:8px 12px;border:1px solid #e5e5e5;font-weight:600;width:160px;">${escapeHtml(row.label)}</td><td style="padding:8px 12px;border:1px solid #e5e5e5;">${escapeHtml(String(row.value))}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;font-family:Arial,sans-serif;color:#1a1a1a;background:#f7f7f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;">
    <tr>
      <td style="padding:24px;border-bottom:1px solid #e5e5e5;">
        <h1 style="margin:0 0 4px;font-size:20px;">${escapeHtml(formName)}</h1>
        <p style="margin:0;color:#666;font-size:14px;">${escapeHtml(shopName)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rowsHtml}</table>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px;border-top:1px solid #e5e5e5;color:#888;font-size:12px;">
        Submitted ${escapeHtml(submittedAt)} via Integriti Forms
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatSmtpError(err) {
  const code = err.code || "";
  const host = err.hostname || err.address || "";

  if (["EDNS", "ENOTFOUND", "ETIMEOUT", "ESOCKET", "ECONNREFUSED"].includes(code)) {
    return `Could not reach the SMTP server${host ? ` (${host})` : ""}. Check the host and port, disable VPN/firewall blocks on outbound SMTP, and verify your internet connection. For Gmail, use an App Password on port 587.`;
  }
  if (code === "EAUTH") {
    return "SMTP login failed. Verify your username and password. Gmail and Yahoo require an App Password when 2FA is enabled.";
  }
  if (code === "ETIMEDOUT") {
    return "SMTP connection timed out. Try port 465 with TLS/SSL enabled, or check if your network blocks SMTP ports.";
  }
  return err.message || "Failed to send email.";
}

export function createTransporter(settings) {
  if (!settings.smtpHost || !settings.emailTo) return null;

  const password = settings.smtpPass ? decrypt(settings.smtpPass) : undefined;
  const port = settings.smtpPort || 587;
  const secure = Boolean(settings.smtpSecure);

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port,
    secure,
    requireTLS: !secure && port === 587,
    auth:
      settings.smtpUser && password
        ? { user: settings.smtpUser, pass: password }
        : undefined,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    tls: { minVersion: "TLSv1.2" },
  });
}

async function buildAttachments(files) {
  const attachments = [];
  for (const file of files) {
    if (file.sizeBytes > MAX_ATTACHMENT_BYTES) {
      console.warn(`Skipping attachment ${file.originalName}: exceeds size limit`);
      continue;
    }
    try {
      const content = await getFileBuffer(file.storageKey);
      attachments.push({
        filename: file.originalName,
        content,
        contentType: file.mimeType,
      });
    } catch (err) {
      console.error(`Failed to attach ${file.originalName}:`, err);
    }
  }
  return attachments;
}

export async function sendSubmissionEmail({
  settings,
  formName,
  shopName,
  schema,
  payload,
  files = [],
}) {
  const transporter = createTransporter(settings);
  if (!transporter) return { sent: false, reason: "SMTP not configured" };

  const rows = formatSubmissionForDisplay(schema, payload);
  const submittedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const text = rows.map((r) => `${r.label}: ${r.value}`).join("\n");
  const html = buildHtml({ formName, shopName, rows, submittedAt });
  const attachments = await buildAttachments(files);

  const mailOptions = {
    from: settings.smtpUser || settings.emailTo,
    to: settings.emailTo,
    cc: settings.emailCc || undefined,
    subject: `New submission: ${formName}`,
    text: `New submission for ${formName}\n\n${text}\n\nSubmitted ${submittedAt}`,
    html,
    attachments,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { sent: true };
  } catch (err) {
    console.error("Submission email failed:", err);
    return { sent: false, reason: formatSmtpError(err) };
  }
}

export async function sendTestEmail(settings) {
  const transporter = createTransporter(settings);
  if (!transporter) {
    throw new Error("SMTP is not fully configured. Set host and recipient email.");
  }

  if (!settings.smtpPass) {
    throw new Error("SMTP password is required. Save your password in settings first.");
  }

  if (!settings.smtpUser) {
    throw new Error("SMTP username is required (usually your full email address).");
  }

  try {
    await transporter.verify();
  } catch (err) {
    throw new Error(formatSmtpError(err));
  }

  try {
    await transporter.sendMail({
      from: settings.smtpUser || settings.emailTo,
      to: settings.emailTo,
      subject: "Integriti Forms — test email",
      text: "Your SMTP settings are working correctly.",
      html: "<p>Your SMTP settings are working correctly.</p>",
    });
  } catch (err) {
    throw new Error(formatSmtpError(err));
  }
}
