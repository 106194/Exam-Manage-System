const express = require('express');
const pool = require('../db/db');
const bcrypt = require('bcrypt');
const sendMessagePage = require('../utils/messagePage');

const router = express.Router();

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return sendMessagePage(res, 'Invalid Request', 'Missing token or password.', 'Try Again', '/forgot-password.html');
  }

  try {
    // Step 1: Find token
    const result = await pool.query(
      `SELECT "Email" FROM "ResetTokens" WHERE "Token" = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return sendMessagePage(res, 'Invalid or Expired', 'This reset link is invalid or has already been used.', 'Try Again', '/forgot-password.html');
    }

    const email = result.rows[0].Email;

    await pool.query('BEGIN');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE "Users" SET "Password" = $1 WHERE "Email" = $2`,
      [hashedPassword, email]
    );
    await pool.query(`DELETE FROM "ResetTokens" WHERE "Token" = $1`, [token]);
    await pool.query('COMMIT');
    return sendMessagePage(res, 'Password Updated', 'Your password has been reset successfully.', 'Sign In', '/signin.html');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    return sendMessagePage(res, 'Server Error', 'Something went wrong. Try again later.', 'Retry', '/forgot-password.html');
  }
});

module.exports = router;
