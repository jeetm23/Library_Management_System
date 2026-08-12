const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  getAllNotifications,
  markAsRead,
  sendReminders,
  getDashboardStats,
  getMonthlyIssues,
  getTopBooks,
} = require('../controllers/notification.controller');

router.use(authenticate);

// Notification routes
router.get('/', getAllNotifications);
router.put('/:id/read', markAsRead);
router.post('/send-reminders', sendReminders);

module.exports = router;
