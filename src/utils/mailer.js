const nodemailer = require('nodemailer');

/** Lazily-created singleton transporter. */
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_ID,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  return _transporter;
}

/**
 * Send a 6-digit OTP email.
 * @param {string} to    Recipient email address
 * @param {string} otp   6-digit code
 */
async function sendOtpEmail(to, otp) {
  const transporter = getTransporter();

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;border:1px solid #e0e0e0;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/600px-Instagram_icon.png"
             alt="Instagram" width="48" style="border-radius:12px;" />
      </div>
      <h2 style="font-size:20px;font-weight:700;color:#262626;margin:0 0 8px;">Your confirmation code</h2>
      <p style="font-size:14px;color:#737373;margin:0 0 24px;line-height:1.5;">
        Use the code below to reset your Instagram password. This code expires in <strong>10 minutes</strong>.
      </p>
      <div style="background:#f5f5f5;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
        <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#262626;">${otp}</span>
      </div>
      <p style="font-size:12px;color:#aaaaaa;line-height:1.5;margin:0;">
        If you didn't request this, you can safely ignore this email. Someone may have typed your email address by mistake.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Instagram" <${process.env.GMAIL_ID}>`,
    to,
    subject: `${otp} is your Instagram confirmation code`,
    html,
    text: `Your Instagram confirmation code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`,
  });
}

module.exports = { sendOtpEmail };
