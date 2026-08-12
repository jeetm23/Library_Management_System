const prisma = require('../prisma');
const { sendResponse, getPagination, paginatedResponse, getTodayRange, addDays } = require('../utils/helpers');
const { sendDueReminder } = require('../services/email.service');

/**
 * GET /api/notifications — All notifications (admin view)
 */
const getAllNotifications = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { type, unread, studentId } = req.query;

    const where = {};

    if (type) {
      where.type = type;
    }

    if (unread === 'true') {
      where.isRead = false;
    } else if (unread === 'false') {
      where.isRead = true;
    }

    if (studentId) {
      where.studentId = parseInt(studentId);
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    // Enrich with student names
    const enriched = await Promise.all(
      notifications.map(async (notif) => {
        const student = await prisma.student.findUnique({
          where: { id: notif.studentId },
          select: { id: true, name: true, enrollmentNo: true },
        });
        return { ...notif, student };
      })
    );

    return sendResponse(
      res, 200, true, 'Notifications fetched.',
      paginatedResponse(enriched, total, page, limit)
    );
  } catch (error) {
    console.error('Get notifications error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch notifications.');
  }
};

/**
 * PUT /api/notifications/:id/read — Mark as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(id) },
    });

    if (!notification) {
      return sendResponse(res, 404, false, 'Notification not found.');
    }

    const updated = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { isRead: !notification.isRead },
    });

    return sendResponse(res, 200, true, `Notification marked as ${updated.isRead ? 'read' : 'unread'}.`, updated);
  } catch (error) {
    console.error('Mark read error:', error);
    return sendResponse(res, 500, false, 'Failed to update notification.');
  }
};

/**
 * POST /api/notifications/send-reminders — Manually trigger reminder emails
 */
const sendReminders = async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Find books due tomorrow
    const dueIssues = await prisma.bookIssue.findMany({
      where: {
        status: 'ISSUED',
        dueDate: {
          gte: tomorrow,
          lt: dayAfter,
        },
      },
      include: {
        student: true,
        book: true,
      },
    });

    let sentCount = 0;
    for (const issue of dueIssues) {
      await sendDueReminder(issue.student, issue.book, issue.dueDate, 1);

      await prisma.notification.create({
        data: {
          studentId: issue.studentId,
          type: 'DUE_REMINDER',
          message: `Manual reminder: "${issue.book.title}" is due tomorrow.`,
        },
      });

      sentCount++;
    }

    return sendResponse(res, 200, true, `Sent ${sentCount} reminder(s).`, {
      remindersSent: sentCount,
      dueIssuesFound: dueIssues.length,
    });
  } catch (error) {
    console.error('Send reminders error:', error);
    return sendResponse(res, 500, false, 'Failed to send reminders.');
  }
};

/**
 * GET /api/dashboard/stats — Dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    const { start, end } = getTodayRange();

    const [
      totalBooks,
      totalStudents,
      totalIssued,
      overdueCount,
      totalFineCollected,
      todayLogs,
      recentIssues,
      booksByCategory,
    ] = await Promise.all([
      prisma.book.aggregate({ _sum: { totalCopies: true } }),
      prisma.student.count({ where: { isActive: true } }),
      prisma.bookIssue.count({ where: { status: { in: ['ISSUED', 'OVERDUE'] } } }),
      prisma.bookIssue.count({ where: { status: 'OVERDUE' } }),
      prisma.fine.aggregate({ _sum: { amount: true }, where: { isPaid: true } }),
      prisma.rFIDLog.findMany({
        where: { timestamp: { gte: start, lt: end } },
      }),
      prisma.bookIssue.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { name: true, enrollmentNo: true } },
          book: { select: { title: true, author: true } },
        },
      }),
      prisma.book.groupBy({
        by: ['category'],
        _sum: { totalCopies: true },
        _count: { id: true },
      }),
    ]);

    const todayEntries = todayLogs.filter((l) => l.entryType === 'ENTRY').length;
    const todayExits = todayLogs.filter((l) => l.entryType === 'EXIT').length;

    return sendResponse(res, 200, true, 'Dashboard stats fetched.', {
      totalBooks: totalBooks._sum.totalCopies || 0,
      totalStudents,
      totalIssued,
      overdueCount,
      totalFineCollected: totalFineCollected._sum.amount || 0,
      todayEntries,
      todayExits,
      recentActivity: recentIssues,
      booksByCategory: booksByCategory.map((c) => ({
        category: c.category,
        count: c._count.id,
        totalCopies: c._sum.totalCopies,
      })),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch dashboard stats.');
  }
};

/**
 * GET /api/reports/monthly-issues — Issues per month (for charts)
 */
const getMonthlyIssues = async (req, res) => {
  try {
    const issues = await prisma.bookIssue.findMany({
      select: { issueDate: true, status: true },
      where: {
        issueDate: {
          gte: new Date(new Date().getFullYear(), 0, 1), // Current year
        },
      },
    });

    // Group by month
    const monthlyData = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    months.forEach((month) => {
      monthlyData[month] = { month, issued: 0, returned: 0 };
    });

    issues.forEach((issue) => {
      const month = months[new Date(issue.issueDate).getMonth()];
      monthlyData[month].issued++;
      if (issue.status === 'RETURNED') {
        monthlyData[month].returned++;
      }
    });

    return sendResponse(res, 200, true, 'Monthly issues fetched.', Object.values(monthlyData));
  } catch (error) {
    console.error('Monthly issues error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch monthly issues.');
  }
};

/**
 * GET /api/reports/top-books — Most issued books
 */
const getTopBooks = async (req, res) => {
  try {
    const topBooks = await prisma.bookIssue.groupBy({
      by: ['bookId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const enriched = await Promise.all(
      topBooks.map(async (item) => {
        const book = await prisma.book.findUnique({
          where: { id: item.bookId },
          select: { id: true, title: true, author: true, category: true },
        });
        return { ...book, issueCount: item._count.id };
      })
    );

    return sendResponse(res, 200, true, 'Top books fetched.', enriched);
  } catch (error) {
    console.error('Top books error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch top books.');
  }
};

module.exports = {
  getAllNotifications,
  markAsRead,
  sendReminders,
  getDashboardStats,
  getMonthlyIssues,
  getTopBooks,
};
