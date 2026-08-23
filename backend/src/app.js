const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

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
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow Vite-built assets
    crossOriginEmbedderPolicy: false,
  })
);

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

// Debug endpoint (REMOVE AFTER FIXING)
app.get('/api/debug', async (req, res) => {
  try {
    const prisma = require('./prisma');
    const userCount = await prisma.user.count();
    const bookCount = await prisma.book.count();
    const studentCount = await prisma.student.count();
    res.json({
      success: true,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'NOT SET',
        JWT_SECRET: process.env.JWT_SECRET ? '✅ SET' : '❌ MISSING',
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ? '✅ SET' : '❌ MISSING',
        DATABASE_URL: process.env.DATABASE_URL ? '✅ SET' : '❌ MISSING',
        CLIENT_URL: process.env.CLIENT_URL || 'NOT SET',
        SMTP_HOST: process.env.SMTP_HOST || 'NOT SET',
        SMTP_USER: process.env.SMTP_USER ? '✅ SET' : '❌ MISSING',
        SMTP_PASS: process.env.SMTP_PASS ? '✅ SET' : '❌ MISSING',
      },
      db: { users: userCount, books: bookCount, students: studentCount },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

// Test student creation (REMOVE AFTER FIXING)
app.get('/api/test-student', async (req, res) => {
  try {
    const prisma = require('./prisma');
    const student = await prisma.student.create({
      data: {
        name: 'Test Student',
        email: `test${Date.now()}@student.edu`,
        department: 'Test',
        enrollmentNo: `TEST${Date.now()}`,
      },
    });
    // Delete it right after
    await prisma.student.delete({ where: { id: student.id } });
    res.json({ success: true, message: 'Student create/delete works fine!', student });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

// Test email (REMOVE AFTER FIXING)
app.get('/api/test-email', async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection first
    await transporter.verify();

    // Send test email
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // send to yourself
      subject: '✅ Library System - Test Email',
      text: 'If you received this, emails are working on Render!',
    });

    res.json({ success: true, message: 'Email sent!', result: { messageId: result.messageId, response: result.response } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, code: error.code, command: error.command });
  }
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

// ━━━━━━━━━━━━━━━ ONE-TIME SEED ENDPOINT ━━━━━━━━━━━━━━━
// Visit: https://YOUR-APP.onrender.com/api/seed?key=library-seed-2026
// DELETE THIS ROUTE AFTER SEEDING!
app.get('/api/seed', async (req, res) => {
  try {
    if (req.query.key !== 'library-seed-2026') {
      return res.status(403).json({ success: false, message: 'Invalid key' });
    }

    const bcrypt = require('bcrypt');
    const prisma = require('./prisma');

    const adminPassword = await bcrypt.hash('admin123', 10);
    const librarianPassword = await bcrypt.hash('librarian123', 10);

    await prisma.user.upsert({
      where: { email: 'admin@library.edu' },
      update: {},
      create: { name: 'Dr. Rajesh Kumar', email: 'admin@library.edu', password: adminPassword, role: 'ADMIN' },
    });

    await prisma.user.upsert({
      where: { email: 'librarian@library.edu' },
      update: {},
      create: { name: 'Priya Sharma', email: 'librarian@library.edu', password: librarianPassword, role: 'LIBRARIAN' },
    });

    const booksData = [
      { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '978-0262033848', category: 'Computer Science', publisher: 'MIT Press', totalCopies: 5, availableCopies: 5, shelfLocation: 'A1-01' },
      { title: 'Clean Code', author: 'Robert C. Martin', isbn: '978-0132350884', category: 'Computer Science', publisher: 'Prentice Hall', totalCopies: 3, availableCopies: 3, shelfLocation: 'A1-02' },
      { title: 'The Pragmatic Programmer', author: 'David Thomas & Andrew Hunt', isbn: '978-0135957059', category: 'Computer Science', publisher: 'Addison-Wesley', totalCopies: 4, availableCopies: 4, shelfLocation: 'A1-03' },
      { title: 'Engineering Mechanics', author: 'R.C. Hibbeler', isbn: '978-0133918922', category: 'Mechanical', publisher: 'Pearson', totalCopies: 6, availableCopies: 6, shelfLocation: 'B2-01' },
      { title: 'Digital Electronics', author: 'Morris Mano', isbn: '978-0132774208', category: 'Electronics', publisher: 'Pearson', totalCopies: 4, availableCopies: 4, shelfLocation: 'C1-01' },
      { title: 'Database System Concepts', author: 'Abraham Silberschatz', isbn: '978-0078022159', category: 'Computer Science', publisher: 'McGraw-Hill', totalCopies: 3, availableCopies: 3, shelfLocation: 'A1-04' },
      { title: 'Structural Analysis', author: 'R.C. Hibbeler', isbn: '978-0134610672', category: 'Civil', publisher: 'Pearson', totalCopies: 3, availableCopies: 3, shelfLocation: 'D1-01' },
      { title: 'Operating System Concepts', author: 'Abraham Silberschatz', isbn: '978-1119800361', category: 'Computer Science', publisher: 'Wiley', totalCopies: 5, availableCopies: 5, shelfLocation: 'A1-05' },
      { title: 'Signals and Systems', author: 'Alan V. Oppenheim', isbn: '978-0138147570', category: 'Electronics', publisher: 'Pearson', totalCopies: 4, availableCopies: 4, shelfLocation: 'C1-02' },
      { title: 'Fluid Mechanics', author: 'Frank M. White', isbn: '978-0073398273', category: 'Mechanical', publisher: 'McGraw-Hill', totalCopies: 3, availableCopies: 3, shelfLocation: 'B2-02' },
    ];

    for (const b of booksData) {
      await prisma.book.upsert({ where: { isbn: b.isbn }, update: {}, create: b });
    }

    const studentsData = [
      { name: 'Aarav Patel', email: 'aarav.patel@student.edu', phone: '9876543210', department: 'Computer Science', rfidUid: 'RFID-001-CS', enrollmentNo: 'CS2024001' },
      { name: 'Ananya Singh', email: 'ananya.singh@student.edu', phone: '9876543211', department: 'Electronics', rfidUid: 'RFID-002-EC', enrollmentNo: 'EC2024002' },
      { name: 'Rohan Gupta', email: 'rohan.gupta@student.edu', phone: '9876543212', department: 'Mechanical', rfidUid: 'RFID-003-ME', enrollmentNo: 'ME2024003' },
      { name: 'Diya Reddy', email: 'diya.reddy@student.edu', phone: '9876543213', department: 'Computer Science', rfidUid: 'RFID-004-CS', enrollmentNo: 'CS2024004' },
      { name: 'Kabir Mehta', email: 'kabir.mehta@student.edu', phone: '9876543214', department: 'Civil', rfidUid: 'RFID-005-CE', enrollmentNo: 'CE2024005' },
    ];

    for (const s of studentsData) {
      await prisma.student.upsert({ where: { email: s.email }, update: {}, create: s });
    }

    res.json({ success: true, message: '🎉 Database seeded! Users, books & students created. NOW DELETE THIS ROUTE!' });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ━━━━━━━━━━━━━━━ STATIC FILES (Production) ━━━━━━━━━━━━━━━

if (process.env.NODE_ENV === 'production') {
  // Serve frontend build output
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));

  // Catch-all: send index.html for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// ━━━━━━━━━━━━━━━ ERROR HANDLING ━━━━━━━━━━━━━━━

// 404 handler (only for /api routes in production)
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
