const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Route imports
const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const bookRoutes = require('./routes/book.routes');
const issueRoutes = require('./routes/issue.routes');
const fineRoutes = require('./routes/fine.routes');
const rfidRoutes = require('./routes/rfid.routes');
const notificationRoutes = require('./routes/notification.routes');

// Dashboard/Reports use notification controller
const { authenticate } = require('./middleware/auth.middleware');
const { authorize } = require('./middleware/role.middleware');
const {
  getDashboardStats,
  getMonthlyIssues,
  getTopBooks,
} = require('./controllers/notification.controller');

const app = express();

// ━━━━━━━━━━━━━━━ MIDDLEWARE ━━━━━━━━━━━━━━━

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// ━━━━━━━━━━━━━━━ ROUTES ━━━━━━━━━━━━━━━

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Library Management System API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/rfid', rfidRoutes);
app.use('/api/notifications', notificationRoutes);

// Dashboard & Reports routes
app.get('/api/dashboard/stats', authenticate, getDashboardStats);
app.get('/api/reports/monthly-issues', authenticate, getMonthlyIssues);
app.get('/api/reports/top-books', authenticate, authorize('ADMIN'), getTopBooks);

// ━━━━━━━━━━━━━━━ ERROR HANDLING ━━━━━━━━━━━━━━━

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists.',
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: 'Record not found.',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

module.exports = app;
