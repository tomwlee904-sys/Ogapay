'use strict';

const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: parseInt(process.env.SMTP_PORT || '587') === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

const sendEmail = async ({ to, subject, html }) => {
  const t = getTransporter();
  if (!t) {
    console.log(`📧 [DEV EMAIL] To: ${to} | Subject: ${subject}`);
    console.log(`📧 [DEV EMAIL] Body: ${html.substring(0, 200)}...`);
    return;
  }
  await t.sendMail({
    from: `"OgaPay" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};

const emailTemplates = {
  verifyEmail: (username, link) => ({
    subject: 'Verify your OgaPay email',
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif">
      <h2 style="color:#191C6D">Welcome ${username}!</h2>
      <p>Click below to verify your email address and start earning:</p>
      <a href="${link}" style="display:inline-block;background:#191C6D;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">Verify Email</a>
      <p style="color:#666;font-size:13px">Link expires in 1 hour. If you didn't create an account, ignore this email.</p>
    </div>`,
  }),
  resetPassword: (username, link) => ({
    subject: 'Reset your OgaPay password',
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif">
      <h2 style="color:#191C6D">Hi ${username}</h2>
      <p>Click below to reset your password. This link expires in 1 hour:</p>
      <a href="${link}" style="display:inline-block;background:#191C6D;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">Reset Password</a>
      <p style="color:#666;font-size:13px">If you didn't request this, ignore this email.</p>
    </div>`,
  }),
  taskApproved: (username, taskTitle, amount, currency) => ({
    subject: 'Your submission was approved!',
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif">
      <h2 style="color:#191C6D">Congrats ${username}! 🎉</h2>
      <p>Your submission for <strong>${taskTitle}</strong> was approved.</p>
      <p style="font-size:24px;font-weight:900;color:#16a34a;text-align:center;padding:16px;background:#f0fdf4;border-radius:8px">${amount} ${currency}</p>
      <p>has been credited to your wallet (platform fee deducted).</p>
    </div>`,
  }),
  taskRejected: (username, taskTitle) => ({
    subject: 'Submission update',
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif">
      <h2 style="color:#191C6D">Hi ${username}</h2>
      <p>Your submission for <strong>${taskTitle}</strong> was not approved.</p>
      <p>Review the task requirements and try again.</p>
    </div>`,
  }),
  withdrawalApproved: (username, amount, currency) => ({
    subject: 'Withdrawal Approved',
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif">
      <h2 style="color:#191C6D">Hi ${username}</h2>
      <p>Your withdrawal of <strong>${amount} ${currency}</strong> has been approved and is being processed.</p>
      <p>Funds should arrive within 1-3 business days.</p>
    </div>`,
  }),
  withdrawalRejected: (username, amount, currency) => ({
    subject: 'Withdrawal Update',
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif">
      <h2 style="color:#191C6D">Hi ${username}</h2>
      <p>Your withdrawal request for <strong>${amount} ${currency}</strong> was not approved.</p>
      <p>Funds have been returned to your wallet. Contact support for details.</p>
    </div>`,
  }),
  walletFunded: (username, amount, currency) => ({
    subject: 'Wallet Funded Successfully',
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif">
      <h2 style="color:#191C6D">Hi ${username}</h2>
      <p>Your wallet has been funded with <strong>${amount} ${currency}</strong>.</p>
      <p>You can now use these funds to post tasks or purchase from the store.</p>
    </div>`,
  }),
};

module.exports = { sendEmail, emailTemplates };
