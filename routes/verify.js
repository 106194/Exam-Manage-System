const express = require('express');
const pool = require('../db/db');
const router = express.Router();
const sendMessagePage = require('../utils/messagePage');

router.get('/verify', async (req, res) => {
  const { token } = req.query;

  try {
    //Find the user in PendingUsers
    const result = await pool.query(
      `SELECT * FROM "PendingUsers" WHERE "Token" = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return sendMessagePage(res, 'Invalid', 'Verification token is invalid or expired.', 'Go Home', '/');
    }

    const user = result.rows[0];

    // Insert into Users table
    await pool.query("BEGIN");
    const userResult = await pool.query(
      `INSERT INTO "Users" ("Full_Name","username", "Password", "Email", "Institution", "Phone", "Role"
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "User_ID"`,
      [
        user.Full_Name,
        user.username,
        user.Password,
        user.Email,
        user.Institution,
        user.Phone,
        user.Role
      ]
    );

    //Insert into Student or Teacher table
    const userId = userResult.rows[0].User_ID;
    const registrationDate = new Date().toISOString().split('T')[0];
    if (user.Role === 'student') {
      await pool.query(
        `INSERT INTO "Student" ("User_ID","username", "Profile_Pic", "Registration_Date", "Total_Exam_Participated", "Bio","total_answered","total_wrong")
         VALUES ($1, $2, '', $3, 0, '',0,0)`,
        [userId, user.username, registrationDate]
      );
    } else {
      await pool.query(
        `INSERT INTO "Teacher" ("User_ID","username", "Profile_Pic", "Registration_Date", "Total_Exam_Created", "Bio")
         VALUES ($1, $2, '', $3, 0, '')`,
        [userId, user.username, registrationDate]
      );
    }

    // Delete from PendingUsers
    await pool.query(`DELETE FROM "PendingUsers" WHERE "Token" = $1`, [token]);
    await pool.query("COMMIT");
    return sendMessagePage(res, 'Success', 'Your email has been verified and account created.', 'Login Now', '/signin.html');

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    return sendMessagePage(res, 'Error', 'Something went wrong.', 'Try Again', '/');
  }
});

module.exports = router;
