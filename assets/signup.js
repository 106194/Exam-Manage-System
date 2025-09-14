const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/db');
const sendEmail = require('../utils/sendEmail');
const sendMessagePage = require('../utils/messagePage');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const upload = multer();
const router = express.Router();

router.post('/signup',upload.none(), async (req, res) => {
  const { full_name, username, password, email, role,institution,phone } = req.body;

  // Validate role
  if (!['student', 'teacher'].includes(role)) {
    return res.status(400).send('Invalid role');
  }

  try {
    // Check if user/email exists
    const existing = await pool.query(
      `SELECT * FROM "Users" WHERE "Email" = $1 OR "username" = $2`,
      [email, username]
    );

    if (existing.rowCount > 0) {
      return res.status(400).send('Username or email already exists.');
    }

    const token = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO "PendingUsers" ("Token", "Full_Name", "username", "Password", "Email", "Role","Institution","Phone")
       VALUES ($1, $2, $3, $4, $5, $6,$7,$8)`,
      [token, full_name, username, hashedPassword, email, role,institution,phone]
    );

    const verifyLink = `http://localhost:5000/verify?token=${token}`;

    // Send verification email
    let em="fahimulhoque556@gmail.com";
    await sendEmail(
      em,
      'Verify your Email',
      `<p>Hi ${full_name}, please verify your email by clicking <a href="${verifyLink}">here</a>.</p>`
    );

    sendMessagePage(
  res,
  'Signup Successful',
  'Please check your email to verify your account.',
  'Go Home',
  '/index.html'
);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
