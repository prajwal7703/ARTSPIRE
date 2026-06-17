const nodemailer = require('nodemailer');
const jwt        = require('jsonwebtoken');
require('dotenv').config();

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "SET ✅" : "MISSING ❌");
console.log("CLIENT_URL:", process.env.CLIENT_URL);
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "SET ✅" : "MISSING ❌");

const token    = jwt.sign({ id: "test123" }, process.env.JWT_SECRET, { expiresIn: "15m" });
const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

console.log("Reset URL:", resetUrl);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.sendMail({
  from: `"ArtSpire" <${process.env.EMAIL_USER}>`,
  to:   "prajwalkrish77@gmail.com",
  subject: "ArtSpire Password Reset Test",
  html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
}).then(() => {
  console.log("EMAIL SENT SUCCESSFULLY! ✅");
}).catch((err) => {
  console.log("EMAIL ERROR ❌:", err.message);
});