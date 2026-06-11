const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendResetEmail = async (toEmail, resetUrl) => {
  await transporter.sendMail({
    from: `"Artspire Support" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Reset your Artspire password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #333;">Reset your password</h2>
        <p>You requested a password reset for your Artspire account.</p>
        <p>Click the button below. This link expires in <strong>15 minutes</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;
                  background:#6c47ff;color:#fff;border-radius:6px;
                  text-decoration:none;font-weight:bold;">
          Reset Password
        </a>
        <p style="color:#888;font-size:12px;">
          If you didn't request this, ignore this email — your password won't change.
        </p>
      </div>
    `,
  });
};

module.exports = { sendResetEmail };