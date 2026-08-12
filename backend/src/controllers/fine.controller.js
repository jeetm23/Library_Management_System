const prisma = require('../prisma');
const { sendResponse, getPagination, paginatedResponse } = require('../utils/helpers');

/**
 * GET /api/fines — All fines (filter: paid/unpaid)
 */
const getAllFines = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { paid, search } = req.query;

    const where = {};

    if (paid === 'true') {
      where.isPaid = true;
    } else if (paid === 'false') {
      where.isPaid = false;
    }

    const [fines, total, totalUnpaid] = await Promise.all([
      prisma.fine.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          // We can't directly include relations not in the model
          // So we'll use raw fields and a separate query
        },
      }),
      prisma.fine.count({ where }),
      prisma.fine.aggregate({
        _sum: { amount: true },
        where: { isPaid: false },
      }),
    ]);

    // Enrich fines with student and book info
    const enrichedFines = await Promise.all(
      fines.map(async (fine) => {
        const issue = await prisma.bookIssue.findUnique({
          where: { id: fine.issueId },
          include: {
            student: { select: { id: true, name: true, enrollmentNo: true, department: true } },
            book: { select: { id: true, title: true, author: true } },
          },
        });
        return { ...fine, issue };
      })
    );

    return sendResponse(res, 200, true, 'Fines fetched successfully.', {
      ...paginatedResponse(enrichedFines, total, page, limit),
      summary: {
        totalUnpaid: totalUnpaid._sum.amount || 0,
      },
    });
  } catch (error) {
    console.error('Get fines error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch fines.');
  }
};

/**
 * GET /api/fines/:id — Fine details
 */
const getFineById = async (req, res) => {
  try {
    const { id } = req.params;

    const fine = await prisma.fine.findUnique({ where: { id: parseInt(id) } });
    if (!fine) {
      return sendResponse(res, 404, false, 'Fine not found.');
    }

    const issue = await prisma.bookIssue.findUnique({
      where: { id: fine.issueId },
      include: {
        student: true,
        book: true,
      },
    });

    return sendResponse(res, 200, true, 'Fine details fetched.', { ...fine, issue });
  } catch (error) {
    console.error('Get fine error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch fine details.');
  }
};

/**
 * PUT /api/fines/:id/pay — Mark fine as paid
 */
const payFine = async (req, res) => {
  try {
    const { id } = req.params;

    const fine = await prisma.fine.findUnique({ where: { id: parseInt(id) } });
    if (!fine) {
      return sendResponse(res, 404, false, 'Fine not found.');
    }

    if (fine.isPaid) {
      return sendResponse(res, 400, false, 'Fine is already paid.');
    }

    const updatedFine = await prisma.fine.update({
      where: { id: parseInt(id) },
      data: {
        isPaid: true,
        paidAt: new Date(),
      },
    });

    // Also mark the issue's finePaid as true
    await prisma.bookIssue.update({
      where: { id: fine.issueId },
      data: { finePaid: true },
    });

    return sendResponse(res, 200, true, 'Fine marked as paid.', updatedFine);
  } catch (error) {
    console.error('Pay fine error:', error);
    return sendResponse(res, 500, false, 'Failed to update fine.');
  }
};

/**
 * GET /api/fines/student/:id — All fines for a student
 */
const getStudentFines = async (req, res) => {
  try {
    const { id } = req.params;

    const fines = await prisma.fine.findMany({
      where: { studentId: parseInt(id) },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with issue details
    const enrichedFines = await Promise.all(
      fines.map(async (fine) => {
        const issue = await prisma.bookIssue.findUnique({
          where: { id: fine.issueId },
          include: {
            book: { select: { id: true, title: true, author: true } },
          },
        });
        return { ...fine, issue };
      })
    );

    const totalAmount = fines.reduce((sum, f) => sum + f.amount, 0);
    const unpaidAmount = fines.filter((f) => !f.isPaid).reduce((sum, f) => sum + f.amount, 0);

    return sendResponse(res, 200, true, 'Student fines fetched.', {
      fines: enrichedFines,
      summary: { totalAmount, unpaidAmount, paidAmount: totalAmount - unpaidAmount },
    });
  } catch (error) {
    console.error('Get student fines error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch student fines.');
  }
};

module.exports = {
  getAllFines,
  getFineById,
  payFine,
  getStudentFines,
};
