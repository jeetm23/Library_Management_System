const cron = require('node-cron');
const prisma = require('../prisma');
const { calculateFine } = require('./fine.service');
const { sendDueReminder, sendOverdueAlert } = require('./email.service');

/**
 * Scheduler Service — Automated cron jobs for library operations
 */

const initScheduler = () => {
  console.log('⏰ Initializing cron schedulers...');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. DAILY 9:00 AM — Send due reminders (books due tomorrow)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  cron.schedule('0 9 * * *', async () => {
    console.log('📬 [CRON] Running due reminder check...');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

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

      console.log(`📬 Found ${dueIssues.length} books due tomorrow`);

      for (const issue of dueIssues) {
        const daysRemaining = 1;
        await sendDueReminder(issue.student, issue.book, issue.dueDate, daysRemaining);

        // Create notification record
        await prisma.notification.create({
          data: {
            studentId: issue.studentId,
            type: 'DUE_REMINDER',
            message: `Your book "${issue.book.title}" is due tomorrow (${issue.dueDate.toLocaleDateString()}).`,
          },
        });
      }

      console.log(`✅ [CRON] Due reminders sent: ${dueIssues.length}`);
    } catch (error) {
      console.error('❌ [CRON] Due reminder error:', error.message);
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. DAILY 10:00 AM — Check overdue books and update fines
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  cron.schedule('0 10 * * *', async () => {
    console.log('🔍 [CRON] Running overdue check...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueIssues = await prisma.bookIssue.findMany({
        where: {
          status: { in: ['ISSUED', 'OVERDUE'] },
          dueDate: { lt: today },
          returnDate: null,
        },
        include: {
          student: true,
          book: true,
        },
      });

      console.log(`🔍 Found ${overdueIssues.length} overdue issues`);

      for (const issue of overdueIssues) {
        const { daysOverdue, fineAmount } = calculateFine(issue.dueDate, new Date());

        // Update issue status and fine amount
        await prisma.bookIssue.update({
          where: { id: issue.id },
          data: {
            status: 'OVERDUE',
            fineAmount: fineAmount,
          },
        });

        // Send overdue alert email
        await sendOverdueAlert(issue.student, issue.book, issue.dueDate, daysOverdue, fineAmount);

        // Create notification
        await prisma.notification.create({
          data: {
            studentId: issue.studentId,
            type: 'OVERDUE_ALERT',
            message: `Your book "${issue.book.title}" is ${daysOverdue} days overdue. Current fine: ₹${fineAmount.toFixed(2)}.`,
          },
        });
      }

      console.log(`✅ [CRON] Overdue check completed: ${overdueIssues.length} issues processed`);
    } catch (error) {
      console.error('❌ [CRON] Overdue check error:', error.message);
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. WEEKLY Monday 8:00 AM — Summary report
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  cron.schedule('0 8 * * 1', async () => {
    console.log('📊 [CRON] Generating weekly summary report...');
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [totalBooks, totalStudents, weeklyIssues, weeklyReturns, overdueCount, totalFines] =
        await Promise.all([
          prisma.book.count(),
          prisma.student.count({ where: { isActive: true } }),
          prisma.bookIssue.count({
            where: { issueDate: { gte: oneWeekAgo } },
          }),
          prisma.bookIssue.count({
            where: { returnDate: { gte: oneWeekAgo } },
          }),
          prisma.bookIssue.count({ where: { status: 'OVERDUE' } }),
          prisma.fine.aggregate({
            _sum: { amount: true },
            where: { createdAt: { gte: oneWeekAgo } },
          }),
        ]);

      console.log('📊 [CRON] Weekly Summary:');
      console.log(`   Total Books: ${totalBooks}`);
      console.log(`   Active Students: ${totalStudents}`);
      console.log(`   Issues This Week: ${weeklyIssues}`);
      console.log(`   Returns This Week: ${weeklyReturns}`);
      console.log(`   Currently Overdue: ${overdueCount}`);
      console.log(`   Fines This Week: ₹${totalFines._sum.amount || 0}`);
      console.log('✅ [CRON] Weekly report generated');
    } catch (error) {
      console.error('❌ [CRON] Weekly report error:', error.message);
    }
  });

  console.log('✅ Cron schedulers initialized:');
  console.log('   📬 Due reminders     → Daily at 9:00 AM');
  console.log('   🔍 Overdue check     → Daily at 10:00 AM');
  console.log('   📊 Weekly report     → Monday at 8:00 AM');
};

module.exports = { initScheduler };
