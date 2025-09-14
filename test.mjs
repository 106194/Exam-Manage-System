const express = require('express');
const path = require('path');
const multer = require('multer');
const pool = require('../db/db'); // ✅ assumes db.js is in /db/
const router = express.Router();

// Multer setup for file upload
const upload = multer({
  dest: path.join(__dirname, '../public/uploads')
});

// Middleware to check if user is logged in
function ensureAuthenticated(req, res, next) {
  if (!req.session.user) return res.redirect('/signin');
  next();
}

// ========== DASHBOARD ROUTES ==========
router.get('/student/dashboard', ensureAuthenticated, (req, res) => {
  if (req.session.user.role !== 'student') return res.status(403).send('Forbidden');
  res.sendFile(path.join(__dirname, '../public/student-dashboard.html'));
});

router.get('/teacher/dashboard', ensureAuthenticated, (req, res) => {
  if (req.session.user.role !== 'teacher') return res.status(403).send('Forbidden');
  res.sendFile(path.join(__dirname, '../public/teacher-dashboard.html'));
});

// ========== EDIT PROFILE PAGE ROUTES ==========
router.get('/student/edit-profile', ensureAuthenticated, (req, res) => {
  if (req.session.user.role !== 'student') return res.status(403).send('Forbidden');
  res.sendFile(path.join(__dirname, '../public/student-edit-profile.html'));
});

router.get('/teacher/edit-profile', ensureAuthenticated, (req, res) => {
  if (req.session.user.role !== 'teacher') return res.status(403).send('Forbidden');
  res.sendFile(path.join(__dirname, '../public/teacher-edit-profile.html'));
});

// ========== API TO GET CURRENT USER INFO ==========
router.get('/api/current-user', ensureAuthenticated, async (req, res) => {
  const { user_id, role } = req.session.user;

  try {
    const [userRows] = await pool.query('SELECT Full_Name FROM Users WHERE User_ID = ?', [user_id]);
    const [profileRows] = await pool.query(
      `SELECT Bio, Profile_Pic FROM ${role === 'teacher' ? 'Teacher' : 'Student'} WHERE User_ID = ?`,
      [user_id]
    );

    const name = userRows[0]?.Full_Name || '';
    const bio = profileRows[0]?.Bio || '';
    const profile_pic = profileRows[0]?.Profile_Pic || '/uploads/default-profile.png';

    res.json({ name, bio, profile_pic });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Error fetching user data' });
  }
});

// ========== API TO UPDATE PROFILE ==========
router.post('/api/update-profile', ensureAuthenticated, upload.single('profile_pic'), async (req, res) => {
  const { user_id, role } = req.session.user;
  const { full_name, bio } = req.body;
  const profilePicPath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    // Update full name in Users table
    await pool.query('UPDATE Users SET Full_Name = ? WHERE User_ID = ?', [full_name, user_id]);

    const table = role === 'teacher' ? 'Teacher' : 'Student';
    if (profilePicPath) {
      await pool.query(
        `UPDATE ${table} SET Bio = ?, Profile_Pic = ? WHERE User_ID = ?`,
        [bio, profilePicPath, user_id]
      );
    } else {
      await pool.query(
        `UPDATE ${table} SET Bio = ? WHERE User_ID = ?`,
        [bio, user_id]
      );
    }

    res.redirect(`/${role}/dashboard`);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).send('Failed to update profile');
  }
});

module.exports = router;

// if (role === 'student') {
      //   await pool.query(`DELETE FROM student_answer WHERE student_id = $1`, [userId]);
      //   await pool.query(`DELETE FROM leaderboard WHERE student_id = $1`, [userId]);
      //   await pool.query(`DELETE FROM "Student" WHERE "User_ID" = $1`, [userId]);
      // } else if (role === 'teacher') {
      //   const examsRes = await pool.query(`SELECT exam_id FROM exams WHERE user_id = $1`, [userId]);
      //   const examIds = examsRes.rows.map(row => row.exam_id);

      //   for (const examId of examIds) {
      //     const qRes = await pool.query(`SELECT question_id FROM exam_question WHERE exam_id = $1`, [examId]);
      //     const questionIds = qRes.rows.map(r => r.question_id);

      //     if (questionIds.length > 0) {
      //       await pool.query(`DELETE FROM optiontable WHERE question_id = ANY($1::int[])`, [questionIds]);
      //       await pool.query(`DELETE FROM question WHERE question_id = ANY($1::int[])`, [questionIds]);
      //     }

      //     await pool.query(`DELETE FROM exam_question WHERE exam_id = $1`, [examId]);
      //   }

      //   await pool.query(`DELETE FROM exams WHERE user_id = $1`, [userId]);
      //   await pool.query(`DELETE FROM "Teacher" WHERE "User_ID" = $1`, [userId]);
      // }



/*UPDATE exams
SET start_time = '2025-07-30 02:55:00',
    end_time = '2025-07-30 02:59:00'
WHERE exam_id = 191; */