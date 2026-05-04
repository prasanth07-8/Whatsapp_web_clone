const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User       = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// In-memory OTP store: { email -> { otp, expiresAt, userId } }
const otpStore = new Map();

// Nodemailer transporter — Gmail with App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendOtpEmail = async (email, otp, username) => {
  await transporter.sendMail({
    from: `"WhatsApp Clone" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your WhatsApp login code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#111b21;color:#e9edef;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <svg viewBox="0 0 24 24" width="48" height="48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#00a884" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <h2 style="text-align:center;color:#e9edef;margin:0 0 8px;">Hi ${username},</h2>
        <p style="text-align:center;color:#8696a0;margin:0 0 32px;">Your WhatsApp login verification code is:</p>
        <div style="text-align:center;background:#202c33;border-radius:12px;padding:24px;margin-bottom:24px;">
          <span style="font-size:2.5rem;font-weight:700;letter-spacing:0.3em;color:#00a884;">${otp}</span>
        </div>
        <p style="text-align:center;color:#8696a0;font-size:0.85rem;">This code expires in <strong style="color:#e9edef;">10 minutes</strong>.</p>
        <p style="text-align:center;color:#8696a0;font-size:0.8rem;margin-top:16px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists)
      return res.status(409).json({ message: 'Username or email already taken' });

    const user = await User.create({ username, email, password });
    const token = signToken(user._id);
    res.status(201).json({ token, user: { _id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ message: err.message });
  }
};

// Step 1: Verify credentials → send OTP
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email, { otp, expiresAt, userId: user._id.toString() });

    // Send OTP email
    try {
      await sendOtpEmail(email, otp, user.username);
    } catch (mailErr) {
      console.error('Email send error:', mailErr.message);
      // In dev: log OTP to console so you can test without email config
      console.log(`[DEV] OTP for ${email}: ${otp}`);
    }

    res.json({ requiresOtp: true, email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Step 2: Verify OTP → return JWT
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: 'Email and OTP are required' });

    const record = otpStore.get(email);
    if (!record)
      return res.status(400).json({ message: 'No OTP found. Please login again.' });

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP expired. Please login again.' });
    }

    if (record.otp !== otp.trim())
      return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });

    // OTP valid — clear it and issue JWT
    otpStore.delete(email);

    const user = await User.findById(record.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await User.findByIdAndUpdate(user._id, { lastSeen: new Date() });

    const token = signToken(user._id);
    res.json({ token, user: { _id: user._id, username: user.username, email: user.email, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
