const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const pool = require('./db/db');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const signupRoutes = require('./assets/signup');
const signinRoutes = require('./assets/signin');
const dashboardRoutes = require('./routes/dashboardRoutes');
const searchRoutes = require('./routes/searchRoutes');
const apiRoutes = require('./routes/apiRoutes');
const verifyRoutes = require('./routes/verify');
const resetPasswordRoute = require('./routes/resetPassword');
const forgotPasswordRoutes = require('./routes/forgotPassword');
const sendMessagePage = require('./utils/messagePage');
dotenv.config();
const app = express();
//// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Session
app.use(session({ secret: 'secretKey', resave: false, saveUninitialized: true }));
// Routes
app.use(signupRoutes);
app.use(signinRoutes);
app.use(dashboardRoutes);
app.use(searchRoutes);
app.use(apiRoutes);
app.use(verifyRoutes);
app.use(resetPasswordRoute);
app.use(forgotPasswordRoutes);
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});
app.get('/signin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signin.html'));
});
app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
//ht..../index
app.get('/search-results', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'search-results.html'));
});
app.get('/profile/:username', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});
app.get('/exam-details/:exam_id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'exam-details.html'));
})
app.get('/admindashboard',(req,res)=>{
  res.sendFile(path.join(__dirname, 'public', 'admindashboard.html'));
})
app.get('/attempt-exam/:exam_id', async (req, res) => {
  const { exam_id } = req.params;
  const studentId = req.session.user.id;

  const alreadyAttempted = await pool.query(
    `SELECT 1 FROM student_answer WHERE student_id = $1 AND exam_id = $2 LIMIT 1`,
    [studentId, exam_id]
  );

  if (alreadyAttempted.rowCount > 0) {
    return sendMessagePage(
      res,
      'Exam Already Attempted',
      'You have already submitted this exam. Multiple attempts are not allowed.',
      'Go to Dashboard',
      '/student/dashboard'
    );
  }
  res.sendFile(path.join(__dirname, 'public', 'attempt-exam.html'));
});
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/student-dashboard');
    }
    res.redirect('/signin');
  });
});
app.get('/exam/:examId/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});
app.get('/exam/:examId/questions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'question-view.html'));
});
app.get('/exam/:examId/studentLeaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'student-leaderboard.html'));
});
app.get('/exam/:examId/testResult/:studentId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-result.html'));
});
app.get('/exam/:examId/testQuestions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-yourself.html'));
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});