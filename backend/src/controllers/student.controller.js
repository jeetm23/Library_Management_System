const prisma = require('../prisma');
const { sendResponse, getPagination, paginatedResponse } = require('../utils/helpers');
const { body, validationResult } = require('express-validator');

/**
 * Validation rules
 */
const studentValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('enrollmentNo').trim().notEmpty().withMessage('Enrollment number is required'),
  body('phone').optional().trim(),
  body('rfidUid').optional().trim(),
];

/**
 * GET /api/students — List all students (paginated, searchable)
 */
const getAllStudents = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, department, active } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { enrollmentNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) {
      where.department = { equals: department, mode: 'insensitive' };
    }

    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { issues: true } },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return sendResponse(
      res, 200, true, 'Students fetched successfully.',
      paginatedResponse(students, total, page, limit)
    );
  } catch (error) {
    console.error('Get students error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch students.');
  }
};

/**
 * POST /api/students — Add new student
 */
const createStudent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, 'Validation failed', errors.array());
    }

    const { name, email, phone, department, rfidUid, enrollmentNo } = req.body;

    // Check for duplicate email or enrollment number
    const existing = await prisma.student.findFirst({
      where: {
        OR: [{ email }, { enrollmentNo }],
      },
    });

    if (existing) {
      const field = existing.email === email ? 'email' : 'enrollment number';
      return sendResponse(res, 409, false, `Student with this ${field} already exists.`);
    }

    // Check RFID uniqueness if provided
    if (rfidUid) {
      const rfidExists = await prisma.student.findUnique({ where: { rfidUid } });
      if (rfidExists) {
        return sendResponse(res, 409, false, 'This RFID UID is already assigned to another student.');
      }
    }

    const student = await prisma.student.create({
      data: { name, email, phone, department, rfidUid, enrollmentNo },
    });

    return sendResponse(res, 201, true, 'Student created successfully.', student);
  } catch (error) {
    console.error('Create student error:', error);
    return sendResponse(res, 500, false, 'Failed to create student.');
  }
};

/**
 * GET /api/students/:id — Get student details + issue history
 */
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: parseInt(id) },
      include: {
        issues: {
          include: { book: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { issues: true, entries: true } },
      },
    });

    if (!student) {
      return sendResponse(res, 404, false, 'Student not found.');
    }

    return sendResponse(res, 200, true, 'Student details fetched.', student);
  } catch (error) {
    console.error('Get student error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch student details.');
  }
};

/**
 * PUT /api/students/:id — Update student
 */
const updateStudent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, 'Validation failed', errors.array());
    }

    const { id } = req.params;
    const { name, email, phone, department, rfidUid, enrollmentNo, isActive } = req.body;

    const existing = await prisma.student.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return sendResponse(res, 404, false, 'Student not found.');
    }

    // Check RFID uniqueness if changing
    if (rfidUid && rfidUid !== existing.rfidUid) {
      const rfidExists = await prisma.student.findUnique({ where: { rfidUid } });
      if (rfidExists) {
        return sendResponse(res, 409, false, 'This RFID UID is already assigned.');
      }
    }

    const student = await prisma.student.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(department && { department }),
        ...(rfidUid !== undefined && { rfidUid }),
        ...(enrollmentNo && { enrollmentNo }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return sendResponse(res, 200, true, 'Student updated successfully.', student);
  } catch (error) {
    console.error('Update student error:', error);
    return sendResponse(res, 500, false, 'Failed to update student.');
  }
};

/**
 * DELETE /api/students/:id — Deactivate student (soft delete)
 */
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({ where: { id: parseInt(id) } });
    if (!student) {
      return sendResponse(res, 404, false, 'Student not found.');
    }

    // Check for active issues
    const activeIssues = await prisma.bookIssue.count({
      where: { studentId: parseInt(id), status: { in: ['ISSUED', 'OVERDUE'] } },
    });

    if (activeIssues > 0) {
      return sendResponse(res, 400, false, `Cannot deactivate: student has ${activeIssues} active book issue(s).`);
    }

    await prisma.student.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    return sendResponse(res, 200, true, 'Student deactivated successfully.');
  } catch (error) {
    console.error('Delete student error:', error);
    return sendResponse(res, 500, false, 'Failed to deactivate student.');
  }
};

/**
 * GET /api/students/:id/issues — All books issued to student
 */
const getStudentIssues = async (req, res) => {
  try {
    const { id } = req.params;

    const issues = await prisma.bookIssue.findMany({
      where: { studentId: parseInt(id) },
      include: { book: true },
      orderBy: { createdAt: 'desc' },
    });

    return sendResponse(res, 200, true, 'Student issues fetched.', issues);
  } catch (error) {
    console.error('Get student issues error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch student issues.');
  }
};

/**
 * GET /api/students/:id/fines — All fines of student
 */
const getStudentFines = async (req, res) => {
  try {
    const { id } = req.params;

    const fines = await prisma.fine.findMany({
      where: { studentId: parseInt(id) },
      orderBy: { createdAt: 'desc' },
    });

    return sendResponse(res, 200, true, 'Student fines fetched.', fines);
  } catch (error) {
    console.error('Get student fines error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch student fines.');
  }
};

module.exports = {
  getAllStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentIssues,
  getStudentFines,
  studentValidation,
};
