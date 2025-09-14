const express = require('express');
const pool = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const  sendEmail  = require('../utils/sendEmail');
const sendMessagePage = require('../utils/messagePage');
const multer = require('multer');
const upload = multer();
const router = express.Router();

router.post('/forgot-password',upload.none() ,async (req, res) => {
  const { identifier } = req.body;

  try {
    // Try to find user by email or username
    const result = await pool.query(
      `SELECT "Email", "username" FROM "Users" WHERE "Email" = $1 OR "username" = $1`,
      [identifier]
    );

    if (result.rowCount === 0) {
      return sendMessagePage(res, 'Error', 'No user found with that email or username.', 'Try Again', '/forgot-password.html');
    }

    const { Email } = result.rows[0];
    const token = uuidv4();

    // Save token to ResetTokens table (create this table)
    await pool.query(
      `INSERT INTO "ResetTokens" ("Email", "Token") VALUES ($1, $2)`,
      [Email, token]
    );

    const resetLink = `http://localhost:5000/reset-password.html?token=${token}`;
    await sendEmail(
      Email,
      'Password Reset',
      `<p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset it.</p>`
    );

    return sendMessagePage(res, 'Check Your Email', 'A password reset link has been sent.', 'Go Home', '/index.html');
  } catch (err) {
    console.error(err);
    return sendMessagePage(res, 'Error', 'Internal error occurred.', 'Try Again', '/forgot-password.html');
  }
});

module.exports = router;
