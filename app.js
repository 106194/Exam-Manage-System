const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/', dashboardRoutes);

const studentRoutes = require('./routes/student');
app.use('/student', studentRoutes);

