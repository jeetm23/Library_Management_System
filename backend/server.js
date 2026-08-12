require('dotenv').config();

const app = require('./src/app');
const { initScheduler } = require('./src/services/scheduler.service');

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📚 Library Management System API`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}/api`);
  console.log(`💊 Health: http://localhost:${PORT}/api/health`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Initialize cron schedulers
  initScheduler();
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});
