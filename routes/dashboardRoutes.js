const express = require('express');
const path = require('path');
const pool = require('../db/db');
const multer = require('multer');
const router = express.Router();
const bcrypt = require('bcrypt');
const fs = require('fs');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../public/uploads')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + file.originalname;
    cb(null, uniqueSuffix);
  },
});
const upload = multer({ storage });

function ensureAuthenticated(req, res, next) {
  if (!req.session.user) return res.redirect('/signin');
  next();
}

router.get('/student/dashboard', ensureAuthenticated, (req, res) => {
  if (req.session.user.role !== 'student') {
    console.log(`Hi fahim`);
    return res.status(403).send('Forbidden');
  }
  res.sendFile(path.join(__dirname, '../public/student-dashboard.html'));
});

router.get('/teacher/dashboard', ensureAuthenticated, (req, res) => {
  if (req.session.user.role !== 'teacher') return res.status(403).send('Forbidden');
  res.sendFile(path.join(__dirname, '../public/teacher-dashboard.html'));
});

// Edit Profile page
router.get('/:role/edit-profile', ensureAuthenticated, (req, res) => {
  const { role } = req.params;
  if (!['teacher', 'student'].includes(role)) return res.status(400).send('Invalid role');
  if (req.session.user.role !== role) return res.status(403).send('Forbidden');

  res.sendFile(path.join(__dirname, `../public/${role}-edit-profile.html`));
});
router.get('/create-exam', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, `../public/create-exam.html`));
});
router.get('/developers', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, `../public/developers.html`));
});
router.get('/search', (req, res) => {
  
  res.sendFile(path.join(__dirname, '../public/search.html'));
});
router.post('/developers', ensureAuthenticated, (req, res) => {
  res.redirect(`/${req.session.user.role}/dashboard`);
})
router.post('/create-exam', ensureAuthenticated, async (req, res) => {
  console.log("Hello");
  try {
    const { examTitle, level, examType, subject, paper, chapter, startTime, endTime } = req.body;

    const password = req.body.password;

    let hashedPassword = null;

    if (typeof password === 'string' && password.trim().length > 0) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    console.log(chapter);
    // Determine flags based on 'type'
    const isSubjectWise = (examType === 'Subjectwise');
    const isChapterWise = (examType === 'Chapterwise');
    // Construct subject_id
    // Adjust this logic to fit your DB schema, example:
    // Let's assume subject_id is just subject's DB ID (number), you might fetch it from DB instead of concatenating strings.
    let subject_id = null;
    let chapter_id = null;
    if (subject !== 'Others') {
      if ((level === 'HSC' || level === 'SSC') && isChapterWise) {
        chapter_id = level + chapter;
      }
      if (level === 'SSC' || subject === 'ICT') {
        subject_id = level + subject; // assuming subject is ID or code
      } else if (level === 'HSC') {
        // maybe concatenate paper? Or fetch paper ID separately?
        subject_id = level + subject + paper; // This might not be ideal, consider revising
      }
    }
    else {
      subject_id = 'Others';
      chapter_id = 'Others';
    }

    // Get teacher_id from authenticated user session (adjust according to your auth system)
    const teacher_id = req.session.user.id;

    // Insert into DB
    const result = await pool.query(
      `INSERT INTO exams 
       (title, password, subject_id, issubjectwise, ischapterwise, start_time, end_time, user_id,chapter_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8,$9) returning exam_id`,
      [examTitle, hashedPassword, subject_id, isSubjectWise, isChapterWise, startTime, endTime, teacher_id, chapter_id]
    );

    /* -------Trigger-----

    CREATE OR REPLACE TRIGGER trg_increment_exam_count
    AFTER INSERT ON EXAMS
    FOR EACH ROW
    BEGIN
      UPDATE TEACHER
      SET TOTAL_EXAM_CREATED = TOTAL_EXAM_CREATED + 1
      WHERE USER_ID = :NEW.USER_ID;
    END;
    / 
    */

    const examId = result.rows[0].exam_id;

    res.redirect(`/set-question/${examId}`);

  } catch (err) {
    console.error('Error creating exam:', err);
    return res.status(500).send('Server error while creating exam');
  }
});
router.get('/set-question/:exam_id', async (req, res) => {
  const examId = req.params.exam_id;

  try {
    const result = await pool.query(
      'SELECT issubjectwise,ischapterwise, subject_id, chapter_id FROM exams WHERE exam_id = $1',
      [examId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Exam not found");
    }

    const { issubjectwise, ischapterwise, subject_id, chapter_id } = result.rows[0];
    let level = null;
    let exam_type = null;
    let subject = null;
    let chapter = null;
    let paper = null;
    console.log(subject_id);
    console.log(chapter_id);
    if (issubjectwise === false && ischapterwise === false) level = 'Others';
    else if (subject_id !== 'Others') {
      level = subject_id.slice(0, 3);
      exam_type = issubjectwise === true ? 'Subjectwise' : 'Chapterwise';
      if (level === 'HSC') {
        if (subject_id.slice(3) == 'ICT') {
          subject = 'ICT';
        }
        else {
          subject = subject_id.slice(3, -3);
          paper = subject_id.slice(-3);
        }
      }
      else if (level === 'SSC') {
        subject = subject_id.slice(3);
      }
      if (ischapterwise) {
        chapter = chapter_id.slice(3);
      }
      console.log(chapter);
    }
    res.redirect(`/set-question.html?exam_id=${examId}&level=${level}&examType=${exam_type}&subject=${subject}&chapter=${encodeURIComponent(chapter || '')}&paper=${paper}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load exam info");
  }
});
router.delete('/question-suggestion/:examId/:questionId', async (req, res) => {
  const { examId, questionId } = req.params;
  try {
    await pool.query(
      `DELETE FROM exam_question WHERE exam_id = $1 AND question_id = $2`,
      [examId, questionId]
    );
    res.status(200).json({ message: "Question removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove question" });
  }
});

router.post('/question-suggestion/:examId/:questionId', async (req, res) => {
  const { examId, questionId } = req.params;

  try {
    await pool.query(
      `INSERT INTO exam_question (exam_id, question_id) VALUES ($1, $2)`,
      [examId, questionId]
    );
    res.status(200).json({ message: 'Question added to exam successfully' });
  } catch (error) {
    console.error('Error inserting question into exam:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/set-question/:exam_id', upload.any(), async (req, res) => {
  const examId = req.params.exam_id;
  const {
    questionType,
    questionText,
    marks,
    chapter,
    level
  } = req.body;
  const rslt = await pool.query(
    `select * from exams where exam_id=$1`, [examId]
  )
  const subject_id = rslt.rows[0].subject_id;
  // Collect correct option indices (can be multiple)
  const correctOptions = Array.isArray(req.body.correctOption)
    ? req.body.correctOption
    : req.body.correctOption
      ? [req.body.correctOption]
      : [];

  const files = req.files || [];

  try {
    // Get question image filename if image
    let questionImage = null;
    if (questionType === 'image') {
      const qImage = files.find(f => f.fieldname === 'questionImage');
      questionImage = qImage ? `/uploads/${qImage.filename}` : null;
    }
    let chapter_id = 'Others';
    if (level !== 'Others' && subject_id !== 'Others') {
      chapter_id = level + chapter;
    }
      await pool.query("BEGIN");
    // Insert into question table
    const questionInsert = await pool.query(
      `INSERT INTO question (chapter_id,points,text,image,subject_id)
       VALUES ($1, $2, $3, $4,$5) RETURNING question_id`,
      [chapter_id, marks, questionText || null, questionImage, subject_id]
    );
    const questionId = questionInsert.rows[0].question_id;

    // Insert into exam_question_linker
    await pool.query(
      `INSERT INTO exam_question (exam_id, question_id) VALUES ($1, $2)`,
      [examId, questionId]
    );

    // Insert all options
    let index = 1;
    while (true) {
      const type = req.body[`optionType${index}`];
      if (!type) break;

      const isText = type === 'text';
      const optionText = req.body[`optionText${index}`] || null;

      const optionImageFile = files.find(f => f.fieldname === `optionImage${index}`);
      const optionImage = optionImageFile ? `/uploads/${optionImageFile.filename}` : null;
      const isCorrect = correctOptions.includes(index.toString());

      await pool.query(
        `INSERT INTO optiontable (question_id, is_correct,text, image)
         VALUES ($1, $2, $3, $4)`,
        [questionId, isCorrect, isText ? optionText : null, isText ? null : optionImage]
      );

      index++;
    }
    await pool.query("COMMIT");
    res.redirect(`/set-question.html?exam_id=${examId}&level=${level}&examType=${req.body.examType}&subject=${req.body.subject}&chapter=${encodeURIComponent(chapter)}&paper=${req.body.paper || ''}`);
  }
  catch (err) {
    await pool.query("ROLLBACK");
    console.error("Error inserting question:", err);
    res.status(500).send("Internal server error");
  }
});
router.post('/api/validate-exam-password', async (req, res) => {
  const { exam_id, password } = req.body;

  try {
    const result = await pool.query(`
      SELECT password, start_time, end_time
      FROM exams
      WHERE exam_id = $1
    `, [exam_id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = result.rows[0];
    const hashedPass = exam.password;

    const isMatch = await bcrypt.compare(password, hashedPass);

    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const now = new Date();
    const start = new Date(exam.start_time);
    const end = new Date(exam.end_time);

    let redirectTo;
    if (now < start) {
      return res.status(403).json({ error: 'Exam has not started yet.' });
    } else if (now > end) {
      redirectTo = `/exam/${exam_id}/studentLeaderboard`;
    } else {
      redirectTo = `/attempt-exam/${exam_id}`;
    }

    res.json({ redirectTo });

  } catch (err) {
    console.error('Error validating exam password:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/finish-exam/:exam_id', async (req, res) => {
  const examId = req.params.exam_id;

  try {
    // Count the number of questions for this exam
    const countRes = await pool.query(
      `SELECT COUNT(*) AS question_count
       FROM exam_question
       WHERE exam_id = $1`,
      [examId]
    );
    await pool.query("BEGIN");
    const questionCount = parseInt(countRes.rows[0].question_count, 10);
    if (questionCount === 0) {
      await pool.query(
        `delete from exams 
        where exam_id=$1
        `, [examId]
      );
      return res.sendStatus(200);
    }

    const totalRes = await pool.query(
      `SELECT SUM(points) AS total_marks
       FROM exam_question eq
       JOIN question q ON eq.question_id = q.question_id
       WHERE eq.exam_id = $1`,
      [examId]
    );

    const totalMarks = totalRes.rows[0].total_marks ? parseInt(totalRes.rows[0].total_marks, 10) : 0;
    // Update the exam table
    await pool.query(
      `UPDATE exams
       SET question_count = $1,
           total_marks = $2
       WHERE exam_id = $3`,
      [questionCount, totalMarks, examId]
    );
    await pool.query("COMMIT");
    res.sendStatus(200); // Success
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("Error finishing exam:", err);
    res.sendStatus(500);
  }
});

//router.post('/create-exam')
// Handle profile update
router.post('/:role/edit-profile', ensureAuthenticated, upload.single('profilePic'), async (req, res) => {
  const { role } = req.params;
  if (!['teacher', 'student'].includes(role)) return res.status(400).send('Invalid role');
  if (req.session.user.role !== role) return res.status(403).send('Forbidden');

  const userId = req.session.user.id;
  const { name, bio, institution } = req.body;
  const profilePicPath = req.file ? `/uploads/${req.file.filename}` : null;
  const roleTable = role === 'teacher' ? '"Teacher"' : '"Student"';

  try {
    await pool.query('BEGIN');

    await pool.query(`UPDATE "Users" SET "Full_Name" = $1 , "Institution"=$2 WHERE "User_ID" = $3`, [name, institution, userId]);
    const oldData = await pool.query(
      `SELECT "Profile_Pic" FROM ${roleTable} WHERE "User_ID" = $1`, [userId]
    );
    const currentPic = oldData.rows[0]?.Profile_Pic;
    if (profilePicPath) {
      if (currentPic && currentPic !== '/uploads/default.png') {
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
    }
    // Update role table for Bio and optionally Profile_Pic
    if (profilePicPath) {
      await pool.query(
        `UPDATE ${roleTable} SET "Bio" = $1, "Profile_Pic" = $2 WHERE "User_ID" = $3`,
        [bio, profilePicPath, userId]
      );
    } else {
      await pool.query(
        `UPDATE ${roleTable} SET "Bio" = $1 WHERE "User_ID" = $2`,
        [bio, userId]
      );
    }
    const result1 = await pool.query(
      `SELECT * from ${roleTable} WHERE "User_ID"=$1`, [userId]
    );
    const result = await pool.query(
      `SELECT * from "Users" WHERE "User_ID"=$1`, [userId]
    );

    await pool.query('COMMIT');
    req.session.user.id = result.rows[0].User_ID;
    req.session.user.name = result.rows[0].Full_Name;
    if (profilePicPath) {
      req.session.user.profile_pic = profilePicPath;
    }
    req.session.user.bio = result1.rows[0].Bio;
    res.redirect(`/${role}/dashboard`);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error updating profile:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
