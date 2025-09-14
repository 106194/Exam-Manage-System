// routes/signin.js
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/db');
const sendMessagePage = require('../utils/messagePage');

const router = express.Router();

router.post('/signin', async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM "Users" WHERE "Email" = $1 OR "username" = $1`,
      [identifier]
    );

    if (result.rowCount === 0) {
      const temp = await pool.query(
        `SELECT * FROM "PendingUsers" WHERE "Email"=$1 OR "username"=$1`, [identifier]
      );
      if (temp.rowCount !== 0) {
        return sendMessagePage(res, "Sign In Failed", "The user is still in pending", "Try Again", '/signin');
      }
      return sendMessagePage(res, 'Sign In Failed', 'User not found.', 'Try Again', '/signin');
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.Password);
    const roleTable = user.Role === 'teacher' ? '"Teacher"' : '"Student"';
    const result1 = await pool.query(
      `SELECT * from ${roleTable} WHERE "User_ID"=$1`, [user.User_ID]
    );
    if (!match) {
      return sendMessagePage(res, 'Sign In Failed', 'Incorrect password.', 'Try Again', '/signin');
    }

    req.session.user = {
      id: user.User_ID,
      name: user.Full_Name,
      username:user.username,
      role: user.Role,
      registrationDate: user.Registration_Date,
      profile_pic: result1.rows[0].Profile_Pic,
      bio: result1.rows[0].Bio,
      institution:user.Institution
    };
    const pp = result1.rows[0].Profile_Pic;

    const dashboardPath = user.Role === 'student' ? '/student/dashboard' : '/teacher/dashboard';
    return sendMessagePage(res, `Welcome, ${user.Full_Name}`, `Logged in as ${user.Role}`, 'Go to Dashboard', dashboardPath);
  } catch (err) {
    console.error(err);
    return sendMessagePage(res, 'Error', 'Internal server error.', 'Try Again', '/signin');
  }
});

module.exports = router;
