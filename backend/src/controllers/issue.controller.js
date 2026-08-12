const prisma = require('../prisma');
const { sendResponse, addDays, getPagination, paginatedResponse } = require('../utils/helpers');
const { calculateFine } = require('../services/fine.service');
const {
  sendIssueConfirmation,
  sendReturnConfirmation,
  sendFineNotice,
} = require('../services/email.service');
const { body, validationResult } = require('express-validator');

/**
 * Validation rules
 */
const issueValidation = [
  body('studentId').isInt({ min: 1 }).withMessage('Valid student ID is required'),
  body('bookId').isInt({ min: 1 }).withMessage('Valid book ID is required'),
  body('dueDays').optional().isInt({ min: 1, max: 365 }).withMessage('Due days must be between 1 and 365'),
];

/**
 * POST /api/issues — Issue a book to student
 */
const issueBook = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, 'Validation failed', errors.array());
    }

    const { studentId, bookId, dueDays } = req.body;
    const issueDays = dueDays || parseInt(process.env.DEFAULT_ISSUE_DAYS) || 14;

    // Verify student exists and is active
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return sendResponse(res, 404, false, 'Student not found.');
    }
    if (!student.isActive) {
      return sendResponse(res, 400, false, 'Cannot issue to inactive student.');
    }

    // Verify book exists and has available copies
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      return sendResponse(res, 404, false, 'Book not found.');
    }
    if (book.availableCopies <= 0) {
      return sendResponse(res, 400, false, 'No copies available for this book.');
    }

    // Check if student already has this book issued
    const existingIssue = await prisma.bookIssue.findFirst({
      where: {
        studentId,
        bookId,
        status: { in: ['ISSUED', 'OVERDUE'] },
      },
    });

    if (existingIssue) {
      return sendResponse(res, 400, false, 'Student already has this book issued.');
    }

    const issueDate = new Date();
    const dueDate = addDays(issueDate, issueDays);

    // Create issue and update book availability in a transaction
    const [issue] = await prisma.$transaction([
      prisma.bookIssue.create({
        data: {
          studentId,
          bookId,
          issueDate,
          dueDate,
          issuedBy: req.user.id,
        },
        include: { student: true, book: true },
      }),
      prisma.book.update({
        where: { id: bookId },
        data: { availableCopies: { decrement: 1 } },
      }),
    ]);

    // Create notification
    await prisma.notification.create({
      data: {
        studentId,
        type: 'ISSUE_CONFIRMATION',
        message: `Book "${book.title}" has been issued to you. Due date: ${dueDate.toLocaleDateString()}.`,
      },
    });

    // Send email (async, don't block)
    sendIssueConfirmation(student, book, issueDate, dueDate).catch(console.error);

    return sendResponse(res, 201, true, 'Book issued successfully.', issue);
  } catch (error) {
    console.error('Issue book error:', error);
    return sendResponse(res, 500, false, 'Failed to issue book.');
  }
};

/**
 * GET /api/issues — All current issues (filter: ISSUED/OVERDUE/RETURNED)
 */
const getAllIssues = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, search } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { student: { enrollmentNo: { contains: search, mode: 'insensitive' } } },
        { book: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [issues, total] = await Promise.all([
      prisma.bookIssue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { id: true, name: true, enrollmentNo: true, department: true, email: true } },
          book: { select: { id: true, title: true, author: true, isbn: true } },
        },
      }),
      prisma.bookIssue.count({ where }),
    ]);

    return sendResponse(
      res, 200, true, 'Issues fetched successfully.',
      paginatedResponse(issues, total, page, limit)
    );
  } catch (error) {
    console.error('Get issues error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch issues.');
  }
};

/**
 * GET /api/issues/:id — Issue details
 */
const getIssueById = async (req, res) => {
  try {
    const { id } = req.params;

    const issue = await prisma.bookIssue.findUnique({
      where: { id: parseInt(id) },
      include: {
        student: true,
        book: true,
      },
    });

    if (!issue) {
      return sendResponse(res, 404, false, 'Issue record not found.');
    }

    return sendResponse(res, 200, true, 'Issue details fetched.', issue);
  } catch (error) {
    console.error('Get issue error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch issue details.');
  }
};

/**
 * PUT /api/issues/:id/return — Return a book
 */
const returnBook = async (req, res) => {
  try {
    const { id } = req.params;

    const issue = await prisma.bookIssue.findUnique({
      where: { id: parseInt(id) },
      include: { student: true, book: true },
    });

    if (!issue) {
      return sendResponse(res, 404, false, 'Issue record not found.');
    }

    if (issue.status === 'RETURNED') {
      return sendResponse(res, 400, false, 'Book has already been returned.');
    }

    const returnDate = new Date();
    const { daysOverdue, fineAmount, isOverdue } = calculateFine(issue.dueDate, returnDate);

    // Update issue and book availability in a transaction
    const operations = [
      prisma.bookIssue.update({
        where: { id: parseInt(id) },
        data: {
          returnDate,
          status: 'RETURNED',
          fineAmount,
        },
        include: { student: true, book: true },
      }),
      prisma.book.update({
        where: { id: issue.bookId },
        data: { availableCopies: { increment: 1 } },
      }),
    ];

    // Create fine record if applicable
    if (isOverdue && fineAmount > 0) {
      operations.push(
        prisma.fine.create({
          data: {
            issueId: parseInt(id),
            studentId: issue.studentId,
            amount: fineAmount,
            reason: `Overdue by ${daysOverdue} days at ₹${process.env.FINE_PER_DAY || 2}/day`,
          },
        })
      );
    }

    const results = await prisma.$transaction(operations);
    const updatedIssue = results[0];
    const fineRecord = results[2] || null;

    // Create return notification
    await prisma.notification.create({
      data: {
        studentId: issue.studentId,
        type: 'RETURN_CONFIRMATION',
        message: `Book "${issue.book.title}" returned successfully.${isOverdue ? ` Fine: ₹${fineAmount.toFixed(2)}` : ''}`,
      },
    });

    // Send return email
    sendReturnConfirmation(issue.student, issue.book, returnDate, fineAmount).catch(console.error);

    // Send fine notice if applicable
    if (isOverdue && fineAmount > 0 && fineRecord) {
      await prisma.notification.create({
        data: {
          studentId: issue.studentId,
          type: 'FINE_NOTICE',
          message: `Fine of ₹${fineAmount.toFixed(2)} applied for overdue book "${issue.book.title}".`,
        },
      });
      sendFineNotice(issue.student, issue.book, fineAmount, fineRecord.id).catch(console.error);
    }

    return sendResponse(res, 200, true, 'Book returned successfully.', {
      issue: updatedIssue,
      fine: fineRecord
        ? { id: fineRecord.id, amount: fineAmount, daysOverdue }
        : null,
    });
  } catch (error) {
    console.error('Return book error:', error);
    return sendResponse(res, 500, false, 'Failed to return book.');
  }
};

/**
 * GET /api/issues/overdue — All overdue issues
 */
const getOverdueIssues = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const issues = await prisma.bookIssue.findMany({
      where: {
        status: { in: ['ISSUED', 'OVERDUE'] },
        dueDate: { lt: today },
        returnDate: null,
      },
      include: {
        student: { select: { id: true, name: true, enrollmentNo: true, department: true, email: true } },
        book: { select: { id: true, title: true, author: true, isbn: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Enrich with calculated fine
    const enriched = issues.map((issue) => {
      const { daysOverdue, fineAmount } = calculateFine(issue.dueDate, new Date());
      return { ...issue, calculatedDaysOverdue: daysOverdue, calculatedFine: fineAmount };
    });

    return sendResponse(res, 200, true, `Found ${enriched.length} overdue issues.`, enriched);
  } catch (error) {
    console.error('Get overdue error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch overdue issues.');
  }
};

module.exports = {
  issueBook,
  getAllIssues,
  getIssueById,
  returnBook,
  getOverdueIssues,
  issueValidation,
};
