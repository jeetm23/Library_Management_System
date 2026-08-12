const prisma = require('../prisma');
const { sendResponse, getTodayRange, getPagination, paginatedResponse } = require('../utils/helpers');
const { sendRFIDEntryAlert } = require('../services/email.service');
const { body, validationResult } = require('express-validator');

/**
 * Validation rules
 */
const scanValidation = [
  body('rfidUid').trim().notEmpty().withMessage('RFID UID is required'),
];

/**
 * POST /api/rfid/scan — Simulate RFID card scan
 */
const scanRFID = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, 'Validation failed', errors.array());
    }

    const { rfidUid } = req.body;

    // 1. Find student by RFID UID
    const student = await prisma.student.findUnique({ where: { rfidUid } });
    if (!student) {
      return sendResponse(res, 404, false, 'Unregistered RFID card.');
    }

    if (!student.isActive) {
      return sendResponse(res, 400, false, 'Student account is inactive.');
    }

    // 2. Get last RFID log for this student
    const lastLog = await prisma.rFIDLog.findFirst({
      where: { studentId: student.id },
      orderBy: { timestamp: 'desc' },
    });

    // 3. Determine entry type
    let entryType;
    if (!lastLog || lastLog.entryType === 'EXIT') {
      entryType = 'ENTRY';
    } else {
      entryType = 'EXIT';
    }

    // 4. Record log
    const timestamp = new Date();
    const log = await prisma.rFIDLog.create({
      data: {
        studentId: student.id,
        rfidUid,
        entryType,
        timestamp,
      },
    });

    // 5. Send email (if enabled)
    const emailNotify = process.env.RFID_EMAIL_NOTIFY === 'true';
    if (emailNotify) {
      sendRFIDEntryAlert(student, entryType, timestamp).catch(console.error);
    }

    return sendResponse(res, 200, true, `Library ${entryType.toLowerCase()} recorded.`, {
      student: {
        id: student.id,
        name: student.name,
        enrollmentNo: student.enrollmentNo,
        department: student.department,
      },
      entryType,
      timestamp,
      logId: log.id,
    });
  } catch (error) {
    console.error('RFID scan error:', error);
    return sendResponse(res, 500, false, 'RFID scan failed.');
  }
};

/**
 * GET /api/rfid/logs — All RFID logs (filterable by date, student)
 */
const getAllLogs = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { date, studentId, entryType } = req.query;

    const where = {};

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.timestamp = { gte: start, lte: end };
    }

    if (studentId) {
      where.studentId = parseInt(studentId);
    }

    if (entryType) {
      where.entryType = entryType;
    }

    const [logs, total] = await Promise.all([
      prisma.rFIDLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          student: {
            select: { id: true, name: true, enrollmentNo: true, department: true },
          },
        },
      }),
      prisma.rFIDLog.count({ where }),
    ]);

    return sendResponse(
      res, 200, true, 'RFID logs fetched.',
      paginatedResponse(logs, total, page, limit)
    );
  } catch (error) {
    console.error('Get RFID logs error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch RFID logs.');
  }
};

/**
 * GET /api/rfid/logs/today — Today's entry/exit log
 */
const getTodayLogs = async (req, res) => {
  try {
    const { start, end } = getTodayRange();

    const logs = await prisma.rFIDLog.findMany({
      where: {
        timestamp: { gte: start, lt: end },
      },
      orderBy: { timestamp: 'desc' },
      include: {
        student: {
          select: { id: true, name: true, enrollmentNo: true, department: true },
        },
      },
    });

    const entries = logs.filter((l) => l.entryType === 'ENTRY').length;
    const exits = logs.filter((l) => l.entryType === 'EXIT').length;

    return sendResponse(res, 200, true, "Today's RFID logs fetched.", {
      logs,
      summary: { entries, exits, total: logs.length },
    });
  } catch (error) {
    console.error('Get today logs error:', error);
    return sendResponse(res, 500, false, "Failed to fetch today's logs.");
  }
};

/**
 * GET /api/rfid/logs/student/:id — Logs for a specific student
 */
const getStudentLogs = async (req, res) => {
  try {
    const { id } = req.params;

    const logs = await prisma.rFIDLog.findMany({
      where: { studentId: parseInt(id) },
      orderBy: { timestamp: 'desc' },
      take: 50,
      include: {
        student: {
          select: { id: true, name: true, enrollmentNo: true, department: true },
        },
      },
    });

    return sendResponse(res, 200, true, 'Student RFID logs fetched.', logs);
  } catch (error) {
    console.error('Get student logs error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch student logs.');
  }
};

module.exports = {
  scanRFID,
  getAllLogs,
  getTodayLogs,
  getStudentLogs,
  scanValidation,
};
