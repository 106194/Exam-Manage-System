const express = require('express');
const router = express.Router();
const sendMessagePage = require('../utils/messagePage');
const pool = require('../db/db');
const sendEmail = require('../utils/sendEmail');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
const secretCodes = {};
const FIXED_ADMIN_ID = 'admin123';
const ADMIN_EMAIL = 'fahimulhoque556@gmail.com';
router.post('/api/remove-profile-pic', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const role = req.session.user.role;
    const currentPic = req.session.user.profile_pic;
    const defaultPic = '/uploads/default.png';

    if (!userId || !role) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const table = role === 'student' ? '"Student"' : '"Teacher"';

    // Delete previous image if it's not the default
    if (currentPic && currentPic !== defaultPic) {
      const absolutePath = path.join(__dirname, '..', 'public', 'uploads', path.basename(currentPic));
      console.log(absolutePath);
      fs.unlink(absolutePath, (err) => {
        if (err) {
          console.error('Failed to delete old profile pic:', err);
        } else {
          console.log('Old profile pic deleted:', absolutePath);
        }
      });
    }
    await pool.query(`UPDATE ${table} SET "Profile_Pic" = $1 WHERE "User_ID" = $2`, [defaultPic, userId]);
    req.session.user.profile_pic = defaultPic;
    res.json({ message: 'Profile picture removed.', profile_pic: defaultPic });

  } catch (err) {
    console.error('Error removing profile picture:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.post('/admin/request-code', async (req, res) => {
  const { adminId } = req.body;

  if (adminId !== FIXED_ADMIN_ID) {
    return res.send('Invalid Admin ID');
  }

  //const code=Math.floor(10000000 + Math.random() * 90000000).toString();
  const code = (1234).toString();
  secretCodes[adminId] = {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  };

  // const html = `
  //   <h2>Your Admin Secret Code</h2>
  //   <p style="font-size: 24px;"><strong>${code}</strong></p>
  //   <p>This code will expire in 5 minutes.</p>
  // `;

  try {
    //   await sendEmail(ADMIN_EMAIL, 'Your Admin Secret Code - ExamSys', html);
    res.send('Code Sent');
  } catch (err) {
    console.error(err);
    res.send('Failed to send email');
  }
});

router.post('/admin/verify-code', (req, res) => {
  const { adminId, adminCode } = req.body;
  const entry = secretCodes[adminId];

  if (!entry) return res.send('No code requested');
  if (Date.now() > entry.expiresAt) {
    delete secretCodes[adminId];
    return res.send('Code expired');
  }

  if (adminCode !== entry.code) return res.send('Incorrect Code');

  delete secretCodes[adminId];
  res.send('Success');
});
router.post('/verify-code', (req, res) => {
  const { adminId, adminCode } = req.body;
  const entry = secretCodes[adminId];

  if (!entry) return res.send('No code requested');
  if (Date.now() > entry.expiresAt) {
    delete secretCodes[adminId];
    return res.send('Code expired');
  }

  if (adminCode !== entry.code) return res.send('Incorrect Code');

  delete secretCodes[adminId];
  res.send('Success');
});

// GET full user profile
router.get('/api/users/:username', async (req, res) => {
  const username = req.params.username;

  try {
    const userRes = await pool.query(
      'SELECT "User_ID", "Full_Name", "Institution", "Role" FROM "Users" WHERE "username" = $1',
      [username]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];
    const user_id = user.User_ID;
    const role = user.Role.toLowerCase();
    const userRole = req.session.user.role;
    const currentUser = req.session.user.id;
    let profile = {
      user_id,
      score_hidden: null,
      currentUser,
      userRole,
      full_name: user.Full_Name,
      institution: user.Institution,
      role: user.Role,
      profile_pic: null,
      bio: null,
      registration_date: null,
      total_exam_created: 0,
      total_exam_participated: 0,
      accuracy: null,
      role: null,
      attempted_exams: [],
      created_exams: []
    };

    if (role === 'student') {
      const studentRes = await pool.query(
        `SELECT "Profile_Pic","score_hidden", "Bio", "Total_Exam_Participated", "Registration_Date", "total_answered", "total_wrong"
         FROM "Student" WHERE "User_ID" = $1`,
        [user_id]
      );
      const data = studentRes.rows[0] || {};

      let acc = null;
      if (data.total_answered && data.total_answered !== 0) {
        acc = ((data.total_answered - data.total_wrong) / data.total_answered) * 100;
        acc = parseFloat(acc.toFixed(2));
      }

      Object.assign(profile, {
        profile_pic: data.Profile_Pic,
        bio: data.Bio,
        score_hidden: data.score_hidden,
        total_exam_participated: data.Total_Exam_Participated || 0,
        accuracy: acc,
        registration_date: data.Registration_Date,
        role: 'student'
      });
      const attemptedRes = await pool.query(
        `SELECT DISTINCT ON (e.exam_id) 
        e.exam_id, 
        e.title,
        e.total_marks, 
        l.score
        FROM student_answer sa
        JOIN exams e ON sa.exam_id = e.exam_id 
        JOIN leaderboard l ON l.exam_id = e.exam_id AND l.student_id = sa.student_id
        WHERE sa.student_id = $1`,
        [user_id]
      );

      profile.attempted_exams = attemptedRes.rows.map(row => ({
        exam_id: row.exam_id,
        title: row.title,
        score: row.score,
        total: row.total_marks
      }));
    }

    else if (role === 'teacher') {
      const teacherRes = await pool.query(
        `SELECT "Profile_Pic", "Bio", "Total_Exam_Created", "Registration_Date"
         FROM "Teacher" WHERE "User_ID" = $1`,
        [user_id]
      );
      const data = teacherRes.rows[0] || {};

      Object.assign(profile, {
        profile_pic: data.Profile_Pic,
        bio: data.Bio,
        total_exam_created: data.Total_Exam_Created || 0,
        registration_date: data.Registration_Date,
        role: 'teacher'
      });

      const createdRes = await pool.query(
        `SELECT e.exam_id, e.title,
           (SELECT COUNT(*) FROM student_answer sa WHERE sa.exam_id = e.exam_id) AS participants
         FROM exams e
         WHERE e.user_id = $1`,
        [user_id]
      );
      console.log(user_id);
      profile.created_exams = createdRes.rows.map(row => ({
        exam_id: row.exam_id,
        title: row.title,
        participants: parseInt(row.participants)
      }));
    }

    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post('/api/students/toggle-score-visibility', async (req, res) => {
  const { userId, score_hidden } = req.body;

  try {
    await pool.query(
      'UPDATE "Student" SET "score_hidden" = $1 WHERE "User_ID" = $2',
      [score_hidden, userId]
    );
    res.json({ message: `Your score is now ${score_hidden ? 'hidden' : 'visible'} to others.` });
  } catch (err) {
    console.error('Toggle error:', err);
    res.status(500).json({ error: 'Failed to update score visibility.' });
  }
});

// GET subjects by level
router.get('/api/subjects', async (req, res) => {
  const level = req.query.level;

  if (!level) {
    return res.status(400).json({ error: 'Missing level parameter' });
  }

  try {
    const result = await pool.query(
      'SELECT name FROM subjects WHERE level = $1 ORDER BY name ASC',
      [level]
    );

    const subjects = result.rows.map(row => row.name);
    res.json(subjects);
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// GET chapters by subject name
router.get('/api/chapters', async (req, res) => {
  const subjectName = req.query.subject;

  if (!subjectName) {
    return res.status(400).json({ error: 'Missing subject parameter' });
  }

  try {
    const subjectResult = await pool.query(
      'SELECT subject_id FROM subjects WHERE name = $1',
      [subjectName]
    );

    if (subjectResult.rowCount === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const subjectId = subjectResult.rows[0].subject_id;

    const chapterResult = await pool.query(
      'SELECT name FROM chapters WHERE subject_id = $1 ORDER BY name ASC',
      [subjectId]
    );

    const chapters = chapterResult.rows.map(row => row.name);
    res.json(chapters);
  } catch (err) {
    console.error('Error fetching chapters:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/api/teacher-exams', async (req, res) => {
  try {
    const now = new Date();
    const userId = req.session.user.id;
    console.log(userId);
    // Fetch your exams
    const yourExamsResult = await pool.query(`
      SELECT exam_id, user_id, title, start_time, end_time, password
      FROM exams
      WHERE user_id = $1
    `, [userId]);

    // Fetch other exams
    const otherExamsResult = await pool.query(`
      SELECT exam_id, user_id, title, start_time, end_time, password
      FROM exams
      WHERE user_id != $1
    `, [userId]);

    const processExams = (exams) => exams.map(exam => {
      const start = new Date(exam.start_time);
      const end = new Date(exam.end_time);
      const durationMinutes = Math.round((end - start) / (1000 * 60));

      return {
        id: exam.exam_id,
        user_id: exam.user_id,
        current_id: req.session.user.id,
        title: exam.title,
        start_date: exam.start_time,
        end_date: exam.end_time,
        duration: durationMinutes,
        protected: exam.password && exam.password.length > 0,
        isPublic: !(exam.password && exam.password.length > 0),
        ended: end < now,
      };
    });

    res.json({
      yourExams: processExams(yourExamsResult.rows),
      otherExams: processExams(otherExamsResult.rows),
    });
  } catch (err) {
    console.error('Error fetching teacher exams:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/api/exam/:examId/questions', async (req, res) => {
  const examId = req.params.examId;

  try {
    // Fetch questions of the exam
    const questionsResult = await pool.query(
      `SELECT q.question_id, q.text, q.chapter_id,q.image
       FROM question q join exam_question eq 
       on q.question_id=eq.question_id
       WHERE eq.exam_id = $1
       ORDER BY q.question_id ASC`,
      [examId]
    );

    if (questionsResult.rowCount === 0) {
      return res.json({ questions: [], options: [] });
    }

    // Extract question IDs for fetching options
    const questionIds = questionsResult.rows.map(q => q.question_id);

    // Fetch options for those questions
    const optionsResult = await pool.query(
      `SELECT option_id, question_id, text, is_correct, image
       FROM optiontable
       WHERE question_id = ANY($1::int[])
       ORDER BY option_id ASC`,
      [questionIds]
    );

    res.json({
      questions: questionsResult.rows,
      options: optionsResult.rows
    });

  } catch (err) {
    console.error('Error fetching questions and options:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.get('/api/exam/:examId/leaderboard', async (req, res) => {
  const examId = req.params.examId;
  try {
    const result = await pool.query(`
      SELECT
        l.student_id AS user_id,
        u."Full_Name" as full_name,
        u."Institution" as institution,
        s."Profile_Pic" as profile_pic,
        l.correct_answer,
        l.wrong_answer,
        l.score AS total_marks,
        l.submitted_at,
        CASE WHEN l.submitted_at > e.end_time THEN TRUE ELSE FALSE END AS disqualified
      FROM leaderboard l
      JOIN "Users" u ON l.student_id = u."User_ID"
      JOIN "Student" s ON s."User_ID" = u."User_ID"
      JOIN exams e ON l.exam_id = e.exam_id
      WHERE l.exam_id = $1
      ORDER BY disqualified ASC, total_marks DESC, l.submitted_at ASC
    `, [examId]);
    const temp = await pool.query(
      `select question_count,total_marks from exams where exam_id=$1`, [examId]
    )
    const qualified = result.rows.filter(r => !r.disqualified);
    const disqualified = result.rows.filter(r => r.disqualified);

    qualified.forEach((row, index) => row.rank = index + 1);

    res.json({ qualified, disqualified, total_question: temp.rows[0].question_count, total_marks: temp.rows[0].total_marks });

  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
router.post('/send-admin-email', async (req, res) => {
  const { email, subject, message } = req.body;
  try {
    const result = await pool.query(
      `SELECT "username", "Role" FROM "Users" WHERE "Email" = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return sendMessagePage(
        res,
        'User Not Found ❌',
        'No user found with this email. Please make sure you are logged in with a valid account.',
        'Try Again',
        '/contact-admin.html'
      );
    }

    const { username, Role } = result.rows[0];

    await pool.query(
      `INSERT INTO messagebox (sender_username, sender_role, subject, textcontent, sent_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [username, Role, subject, message]
    );

    return sendMessagePage(
      res,
      'Message Sent ✅',
      'Your message has been submitted successfully. Admin will respond soon.',
      'Back to Dashboard',
      `/${Role}/dashboard`
    );
  } catch (err) {
    console.error('Error saving message:', err);

    return sendMessagePage(
      res,
      'Message Failed ❌',
      'Something went wrong while submitting your message. Please try again later.',
      'Back to Contact Page',
      '/contact-admin.html'
    );
  }
});

router.get('/api/student-exams', async (req, res) => {
  try {
    const now = new Date();

    const result = await pool.query(`
      SELECT exam_id AS id, title, password, subject_id, chapter_id, issubjectwise, ischapterwise,
             TO_CHAR(start_time, 'Month DD, YYYY HH12:MI AM') AS start_time,
             TO_CHAR(end_time, 'Month DD, YYYY HH12:MI AM') AS end_time,
             start_time AS raw_start,
             end_time AS raw_end
      FROM exams
      ORDER BY start_time ASC
    `);

    const upcoming = [];
    const running = [];
    const past = [];

    result.rows.forEach(exam => {
      let level = null;
      let subject = null;
      let chapter = null;

      if (exam.issubjectwise === false && exam.ischapterwise === false) {
        level = 'Others';
      } else if (exam.subject_id && exam.subject_id !== 'Others') {
        level = exam.subject_id.slice(0, 3);
        if (level === 'HSC') {
          if (exam.subject_id.slice(3) === 'ICT') {
            subject = 'ICT';
          } else {
            subject = exam.subject_id.slice(3, -3) + ' ' + exam.subject_id.slice(-3);
          }
        } else if (level === 'SSC') {
          subject = exam.subject_id.slice(3);
        }
        if (exam.ischapterwise && exam.chapter_id) {
          chapter = exam.chapter_id.slice(3);
        }
      } else {
        level = 'Others';
      }

      const start = new Date(exam.raw_start);
      const end = new Date(exam.raw_end);
      const isprotected = exam.password && exam.password.length !== 0;

      if (now < start) {
        upcoming.push({
          id: exam.id,
          title: exam.title,
          level,
          subject,
          chapter,
          protected: isprotected,
          password: exam.password,
          date: exam.start_time
        });
      } else if (now >= start && now <= end) {
        running.push({
          id: exam.id,
          title: exam.title,
          level,
          subject,
          chapter,
          protected: isprotected,
          password: exam.password,
          end_date: exam.end_time
        });
      } else {
        past.push({
          id: exam.id,
          title: exam.title,
          level,
          subject,
          chapter,
          protected: isprotected,
          password: exam.password,
          date: exam.end_time
        });
      }
    });

    res.json({ upcoming, running, past });
  } catch (err) {
    console.error('Error fetching exams:', err);
    res.status(500).json({ error: 'Failed to load exams' });
  }
});
// server.js or relevant route file
router.get('/api/exam-questions/:examId', async (req, res) => {
  const { examId } = req.params;
  try {
    // Get exam meta (title, start, end)
    const examRes = await pool.query(
      `SELECT title, start_time, end_time FROM exams WHERE exam_id = $1`,
      [examId]
    );

    if (examRes.rowCount === 0)
      return res.status(404).json({ error: 'Exam not found' });

    const exam = examRes.rows[0];
    const start = new Date(exam.start_time);
    const end = new Date(exam.end_time);
    // Get linked question_ids from exam_question linker table
    const linkRes = await pool.query(
      `SELECT question_id FROM exam_question WHERE exam_id = $1`,
      [examId]
    );

    const questionIds = linkRes.rows.map(row => row.question_id);

    // If no questions linked, return empty
    if (questionIds.length === 0) {
      return res.json({
        examTitle: exam.title,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        questions: []
      });
    }


    const questions = [];

    for (const qid of questionIds) {
      const qRes = await pool.query(
        `SELECT question_id, text, image, points FROM question WHERE question_id = $1`,
        [qid]
      );

      if (qRes.rowCount === 0) continue;

      const q = qRes.rows[0];

      const optRes = await pool.query(
        `SELECT option_id, text, image FROM optiontable WHERE question_id = $1`,
        [qid]
      );

      questions.push({
        question_id: q.question_id,
        question_text: q.text,
        question_img: q.image,
        marks: q.points,
        options: optRes.rows.map(opt => ({
          option_id: opt.option_id,
          option_text: opt.text,
          option_img: opt.image
        }))
      });
    }

    res.json({
      examTitle: exam.title,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      student_id: req.session.user.id,
      questions
    });

  } catch (err) {
    console.error('Error fetching exam questions:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/save-answers', async (req, res) => {
  const { exam_id, student_id, answers, is_auto_submitted } = req.body;

  if (!exam_id || !student_id || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  try {
    await pool.query("BEGIN");

    await pool.query(
      `delete from student_answer where exam_id=$1 and student_id=$2`, [exam_id, student_id]
    )
    const insertQuery = `
    INSERT INTO student_answer (student_id, exam_id, question_id, selected_option_id, is_auto_submitted)
    VALUES ($1, $2, $3, $4, $5)
  `;

    let total_answered = 0;
    let total_wrong = 0;
    let score = 0;
    let not_answered = 0;
    for (const ans of answers) {
      const { question_id, selected_option_id } = ans;

      await pool.query(insertQuery, [
        student_id,
        exam_id,
        question_id,
        selected_option_id || null,
        is_auto_submitted
      ]);

      if (selected_option_id) {
        total_answered++;

        const result = await pool.query(
          `SELECT is_correct FROM optiontable WHERE question_id = $1 AND option_id = $2`,
          [question_id, selected_option_id]
        );

        if (result.rows.length && result.rows[0].is_correct === false) {
          total_wrong++;
        } else {
          const point = await pool.query(
            `SELECT points FROM question WHERE question_id = $1`,
            [question_id]
          );
          score += parseInt(point.rows[0].points);
        }
      } else {
        not_answered++;
      }
    }

    await pool.query(
      `UPDATE "Student"
       SET 
         "total_answered" = "total_answered" + $1,
         "total_wrong" = "total_wrong" + $2,
         "Total_Exam_Participated" = "Total_Exam_Participated" + 1
       WHERE "User_ID" = $3`,
      [total_answered, total_wrong, student_id]
    );
    let now = new Date();
    if (is_auto_submitted) {
      const end = await pool.query(
        `select end_time from exams where exam_id=$1`, [exam_id]
      )
      now = end.rows[0].end_time;
    }
    // Insert into leaderboard
    await pool.query(
      `delete from leaderboard where exam_id=$1 and student_id=$2`, [exam_id, student_id]
    )
    await pool.query(
      `INSERT INTO leaderboard (exam_id, student_id, score, submitted_at, correct_answer, wrong_answer)
       VALUES ($1, $2, $3, $4, $5,$6)`,
      [exam_id, student_id, score, now, total_answered - total_wrong, total_wrong]
    );
    await pool.query("COMMIT");

    res.json({ message: 'Answers saved successfully' });

  } catch (err) {
    await pool.query("ROLLBACK");
    console.error('Error saving answers:', err);
    res.status(500).json({ error: 'Failed to save answers' });
  }
});
router.get('/api/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });
  res.json({
    role: req.session.user.role
  });
});

router.get('/api/exam-details/:examId', async (req, res) => {
  const examId = req.params.examId;
  console.log(examId);
  if (!examId) {
    return res.status(400).json({ error: 'Missing exam IDK' });
  }

  try {

    const result = await pool.query(
      `select * from exams where exam_id=$1`, [examId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    const user = result.rows[0];
    const title = user.title;
    const teacher = await pool.query(
      `select * from "Users" where "User_ID"=$1`, [user.user_id]
    )
    const teacher_name = teacher.rows[0].Full_Name;
    const username = teacher.rows[0].username;
    const start_time = user.start_time;
    const end_time = user.end_time;
    const password = user.password;
    let level = null;
    let exam_type = null;
    let subject = null;
    let chapter = null;
    let paper = null;
    const total_marks = user.total_marks;
    const total_questions = user.question_count;
    if (user.issubjectwise === false && user.ischapterwise == false) level = 'Others';
    else if (user.subject_id !== 'Others') {
      level = user.subject_id.slice(0, 3);
      exam_type = user.issubjectwise === true ? 'Subjectwise' : 'Chapterwise';
      if (level === 'HSC') {
        if (user.subject_id.slice(3) == 'ICT') {
          subject = 'ICT';
        }
        else {
          subject = user.subject_id.slice(3, -3);
          paper = user.subject_id.slice(-3);
        }
      }
      else if (level === 'SSC') {
        subject = user.subject_id.slice(3);
      }
      if (user.ischapterwise) {
        chapter = user.chapter_id.slice(3);
      }
    }
    res.json({
      title,
      teacher_name,
      level,
      exam_type,
      subject,
      chapter,
      paper,
      total_marks,
      total_questions,
      start_time,
      end_time,
      password,
      username,
      examId
    });

  }
  catch (error) {
    console.error('Error fetching exam details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/api/current-user', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const user = req.session.user;

  try {

    res.json({
      id: user.id,
      role: user.role,
      name: user.name,
      bio: user.bio,
      profile_pic: user.profile_pic,
      institution: user.institution,
      username: user.username
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
// GET /api/exam/:examId/attempt/:studentId
router.get('/api/exam/:examId/testResult/:studentId', async (req, res) => {
  const { examId, studentId } = req.params;

  try {
    // Get all questions and options
    const questionsRes = await pool.query(`
      SELECT q.question_id, q.text AS question_text, q.image AS question_image,
             o.option_id, o.text AS option_text, o.image AS option_image, o.is_correct
      FROM question q
      JOIN exam_question eq ON eq.question_id = q.question_id
      JOIN optiontable o ON o.question_id = q.question_id
      WHERE eq.exam_id = $1
      ORDER BY q.question_id, o.option_id
    `, [examId]);

    const questionsMap = new Map();
    for (const row of questionsRes.rows) {
      if (!questionsMap.has(row.question_id)) {
        questionsMap.set(row.question_id, {
          question_id: row.question_id,
          question_text: row.question_text,
          question_image: row.question_image,
          options: [],
          correct_option_ids: []
        });
      }
      const q = questionsMap.get(row.question_id);
      q.options.push({
        option_id: row.option_id,
        option_text: row.option_text,
        option_image: row.option_image
      });
      if (row.is_correct) q.correct_option_ids.push(row.option_id);
    }

    // Get student's answers
    const answersRes = await pool.query(`
      SELECT sa.question_id, sa.selected_option_id
      FROM student_answer sa
      WHERE sa.exam_id = $1 AND sa.student_id = $2
    `, [examId, studentId]);

    const studentAnswers = new Map();
    for (const row of answersRes.rows) {
      studentAnswers.set(row.question_id, row.selected_option_id);
    }

    let totalScore = 0;
    const finalQuestions = [];

    for (const [qid, q] of questionsMap.entries()) {
      const selectedOptionId = studentAnswers.get(qid) || null;

      const hasCorrect = q.correct_option_ids.length > 0;

      if (selectedOptionId && hasCorrect && q.correct_option_ids.includes(selectedOptionId)) {
        totalScore++;
      }

      finalQuestions.push({
        question_id: q.question_id,
        question_text: q.question_text,
        question_image: q.question_image,
        options: q.options,
        correct_option_ids: q.correct_option_ids,
        selected_option_id: selectedOptionId
      });
    }

    res.json({
      total_score: totalScore,
      total_marks: finalQuestions.length,
      questions: finalQuestions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch exam result' });
  }
});

// GET /api/exam/:examId/questions
router.get('/api/exam/:examId/testQuestions', async (req, res) => {
  const { examId } = req.params;

  const durationRes = await pool.query(
    'SELECT start_time, end_time FROM exams WHERE exam_id = $1',
    [examId]
  );
  const start_time = durationRes.rows[0].start_time;
  const end_time = durationRes.rows[0].end_time;
  const start = new Date(start_time);
  const end = new Date(end_time);

  const durationMs = end - start; // difference in milliseconds
  const duration_minutes = Math.floor(durationMs / (1000 * 60));
  const questionRes = await pool.query(`
  SELECT q.question_id, q.text AS question_text, q.image AS question_image,
         o.option_id, o.text AS option_text, o.image AS option_image
  FROM question q
  JOIN exam_question eq ON eq.question_id = q.question_id
  JOIN optiontable o ON o.question_id = q.question_id
  WHERE eq.exam_id = $1
  ORDER BY q.question_id, o.option_id
`, [examId]);


  const grouped = {};
  questionRes.rows.forEach(row => {
    if (!grouped[row.question_id]) {
      grouped[row.question_id] = {
        question_id: row.question_id,
        question_text: row.question_text,
        question_image: row.question_image,
        options: []
      };
    }
    grouped[row.question_id].options.push({
      option_id: row.option_id,
      option_text: row.option_text,
      option_image: row.option_image
    });
  });

  res.json({
    duration: duration_minutes,
    questions: Object.values(grouped),
    student_id: req.session.user.id
  });
});
// POST /api/exam/:examId/submit
router.post('/api/exam/:examId/testSubmit', async (req, res) => {
  const { examId } = req.params;
  const { studentId, answers, isAutoSubmitted } = req.body;
  const is_auto_submitted = isAutoSubmitted;
  const exam_id = examId;
  const student_id = studentId;
  if (!exam_id || !student_id || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  try {
    await pool.query("BEGIN");

    await pool.query(
      `delete from student_answer where exam_id=$1 and student_id=$2`, [exam_id, student_id]
    )
    const insertQuery = `
    INSERT INTO student_answer (student_id, exam_id, question_id, selected_option_id, is_auto_submitted)
    VALUES ($1, $2, $3, $4, $5)
  `;

    let total_answered = 0;
    let total_wrong = 0;
    let score = 0;
    let not_answered = 0;
    for (const ans of answers) {
      const { question_id, selected_option_id } = ans;

      await pool.query(insertQuery, [
        student_id,
        exam_id,
        question_id,
        selected_option_id || null,
        is_auto_submitted
      ]);

      if (selected_option_id) {
        total_answered++;

        const result = await pool.query(
          `SELECT is_correct FROM optiontable WHERE question_id = $1 AND option_id = $2`,
          [question_id, selected_option_id]
        );

        if (result.rows.length && result.rows[0].is_correct === false) {
          total_wrong++;
        } else {
          const point = await pool.query(
            `SELECT points FROM question WHERE question_id = $1`,
            [question_id]
          );
          score += parseInt(point.rows[0].points);
        }
      }
      else {
        not_answered++;
      }
    }
    await pool.query(
      `delete from leaderboard where exam_id=$1 and student_id=$2`, [exam_id, student_id]
    )

    await pool.query(
      `INSERT INTO leaderboard (exam_id, student_id, score, submitted_at, correct_answer, wrong_answer)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)`,
      [exam_id, student_id, score, total_answered - total_wrong, total_wrong]
    );
    await pool.query("COMMIT");
    res.json({ message: 'Submission successful' });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: 'Submission failed' });
  }
});
// Leaderboard route
router.get('/api/exam/:examId/studentLeaderboard', async (req, res) => {
  const examId = req.params.examId;

  try {
    // Fetch leaderboard entries for the exam
    const result = await pool.query(`
      SELECT
        l.student_id AS user_id,
        u."Full_Name" as full_name,
        u."Institution" as institution,
        s."Profile_Pic" as profile_pic,
        l.correct_answer,
        l.wrong_answer,
        l.score AS total_marks,
        l.submitted_at,
        CASE WHEN l.submitted_at > e.end_time THEN TRUE ELSE FALSE END AS disqualified
      FROM leaderboard l
      JOIN "Users" u ON l.student_id = u."User_ID"
      JOIN "Student" s ON s."User_ID" = u."User_ID"
      JOIN exams e ON l.exam_id = e.exam_id
      WHERE l.exam_id = $1
      ORDER BY disqualified ASC, total_marks DESC, l.submitted_at ASC
    `, [examId]);

    // Get exam total marks and question count
    const examInfoRes = await pool.query(
      `SELECT question_count, total_marks FROM exams WHERE exam_id = $1`,
      [examId]
    );

    const qualified = result.rows.filter(r => !r.disqualified);
    const disqualified = result.rows.filter(r => r.disqualified);

    // Assign rank only to qualified students
    qualified.forEach((row, index) => {
      row.rank = index + 1;
    });

    res.json({
      qualified,
      disqualified,
      student_id: req.session.user.id,
      total_question: examInfoRes.rows[0]?.question_count || 0,
      total_marks: examInfoRes.rows[0]?.total_marks || 0
    });

  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

function groupQuestions(rows) {
  const questionsMap = new Map();

  for (const row of rows) {
    if (!questionsMap.has(row.question_id)) {
      questionsMap.set(row.question_id, {
        question_id: row.question_id,
        question_text: row.question_text,
        question_image: row.question_image,
        options: []
      });
    }
    if (row.option_id) {
      questionsMap.get(row.question_id).options.push({
        option_id: row.option_id,
        option_text: row.option_text,
        option_image: row.option_image
      });
    }
  }
  return Array.from(questionsMap.values());
}

router.get('/api/questions/suggestion', async (req, res) => {
  const { exam_id } = req.query;

  if (!exam_id) {
    return res.status(400).json({ error: 'Missing exam_id' });
  }

  try {
    // Get exam info
    const examRes = await pool.query(
      `SELECT subject_id, chapter_id, issubjectwise, ischapterwise
       FROM exams WHERE exam_id = $1`,
      [exam_id]
    );

    if (examRes.rowCount === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const { subject_id, chapter_id, issubjectwise, ischapterwise } = examRes.rows[0];

    let level = null;
    let chapter = null;

    if (issubjectwise === false && ischapterwise === false) {
      level = 'Others';
    } else if (subject_id && subject_id !== 'Others') {
      level = typeof subject_id === 'string' ? subject_id.slice(0, 3) : null;

      if (ischapterwise && typeof chapter_id === 'string') {
        chapter = chapter_id.slice(3);  // optional, for UI display
      }
    }

    // Handle invalid levels
    if (level === 'Others' || subject_id === 'Others') {
      return res.json({ questions: [] });
    }

    // Build query with filters and exclusion
    let questionFilter = 'WHERE';
    const params = [];

    if (issubjectwise) {
      questionFilter += ' q.subject_id = $1';
      params.push(subject_id);
    } else if (ischapterwise) {
      questionFilter += ' q.chapter_id = $1';
      params.push(chapter_id);
    }

    // Exclude already added questions
    questionFilter += ` AND q.question_id NOT IN (
      SELECT question_id FROM exam_question WHERE exam_id = $${params.length + 1}
    )`;
    params.push(exam_id);

    // Query questions with options
    const query = `
      SELECT
        q.question_id, q.text AS question_text, q.image AS question_image,
        o.option_id, o.text AS option_text, o.image AS option_image
      FROM question q
      LEFT JOIN optiontable o ON q.question_id = o.question_id
      ${questionFilter}
      ORDER BY q.question_id, o.option_id
    `;

    const result = await pool.query(query, params);

    // Step 5: Group options by question
    const questions = groupQuestions(result.rows);

    res.json({ questions });
  } catch (error) {
    console.error('Error fetching questions suggestion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.get('/teachers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u."username", u."Full_Name", u."Email", u."Institution", u."Phone",
             t."Profile_Pic", t."Registration_Date", t."Bio",u."Role"
      FROM "Users" u
      JOIN "Teacher" t ON u."username" = t."username"
      ORDER BY u."Full_Name"
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching teachers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/students', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u."username", u."Full_Name", u."Email", u."Institution", u."Phone",
             t."Profile_Pic", t."Registration_Date", t."Bio",u."Role"
      FROM "Users" u
      JOIN "Student" t ON u."username" = t."username"
      ORDER BY u."Full_Name"
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.get('/messages', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sender_username, sender_role,subject,message_id,textcontent, sent_at
      FROM messagebox
      ORDER BY sent_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
router.delete('/messages/:id', async (req, res) => {
  try {
    const msgId = req.params.id;
    await pool.query(`DELETE FROM messagebox WHERE message_id = $1`, [msgId]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/update-user', async (req, res) => {
  const { oldUsername, newUsername, newEmail, deactivate, role } = req.body;
  const oldRes = await pool.query(`select "Email" ,"Full_Name" from "Users" where "username"=$1`, [oldUsername]);
  const oldEmail = oldRes.rows[0].Email;
  const fullName = oldRes.rows[0].Full_Name;
  if (!['student', 'teacher'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  try {
    await pool.query('BEGIN');
    if (deactivate) {
      const userRes = await pool.query(`SELECT "User_ID" FROM "Users" WHERE "username" = $1`, [oldUsername]);
      const userId = userRes.rows[0].User_ID;

      /*  ------Trigger----
  
        CREATE OR REPLACE TRIGGER trigger_user_delete
        BEFORE DELETE ON Users
        FOR EACH ROW
        DECLARE
        BEGIN
          IF :OLD.Role = 'student' THEN
            DELETE FROM student_answer WHERE student_id = :OLD.User_ID;
            DELETE FROM leaderboard WHERE student_id = :OLD.User_ID;
            DELETE FROM Student WHERE User_ID = :OLD.User_ID;
          ELSIF :OLD.Role = 'teacher' THEN
            FOR q IN (SELECT q.question_id FROM exam_question q
                      JOIN exams e ON q.exam_id = e.exam_id 
                      WHERE e.user_id = :OLD.User_ID) LOOP
              DELETE FROM optiontable WHERE question_id = q.question_id;
              DELETE FROM question WHERE question_id = q.question_id;
            END LOOP;
  
            FOR e IN (SELECT exam_id FROM exams WHERE user_id = :OLD.User_ID) LOOP
              DELETE FROM exam_question WHERE exam_id = e.exam_id;
              DELETE FROM leaderboard WHERE exam_id = e.exam_id;
              DELETE FROM exams WHERE exam_id = e.exam_id;
            END LOOP;
  
            DELETE FROM Teacher WHERE User_ID = :OLD.User_ID;
          END IF;
        END;
        /
           */
      await pool.query(`DELETE FROM "Users" WHERE "User_ID" = $1`, [userId]);
      await pool.query('COMMIT');
      await sendEmail(
        oldEmail,
        'Account Deactivated',
        `<p>Dear ${fullName},<br>Your account has been permanently deactivated by the admin.<br>If this was a mistake, please contact support.</p>`
      );
      return res.json({ success: true, message: 'Account permanently deleted' });
    }

    // If not deactivating, update normally
    await pool.query(
      `UPDATE "Users" SET "username" = $1, "Email" = $2 WHERE "username" = $3`,
      [newUsername, newEmail, oldUsername]
    );

    // Update role table username if changed
    if (newUsername !== oldUsername) {
      await pool.query(
        `UPDATE "${role === 'student' ? 'Student' : 'Teacher'}" SET "username" = $1 WHERE "username" = $2`,
        [newUsername, oldUsername]
      );
    }

    await pool.query('COMMIT');
    await sendEmail(
      oldEmail,
      'Your Account Information Was Updated',
      `<p>Hello ${fullName},<br>Your account information has been updated by the admin.<br>New Username: ${newUsername}<br>New Email: ${newEmail}</p>`
    );

    res.json({ success: true, message: 'Account Updated' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error updating/deleting user:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});
router.get('/api/search', async (req, res) => {
  const searchQuery = req.query.q;
  try {
    const results = await pool.query(`
      SELECT "Full_Name", "username", "Institution", "Role", "Email"
      FROM "Users"
      WHERE "username" ILIKE $1 OR "Full_Name" ILIKE $1
    `, [`%${searchQuery}%`]);

    res.json(results.rows);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
module.exports = router;
