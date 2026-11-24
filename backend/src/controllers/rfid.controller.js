const prisma = require('../prisma');
const { sendResponse, getTodayRange, getPagination, paginatedResponse } = require('../utils/helpers');
const { sendRFIDEntryAlert } = require('../services/email.service');
const { body, validationResult } = require('express-validator');

/**
 * Validation rules for ESP32 scan
 */
const esp32ScanValidation = [
  body('rfidUid').trim().notEmpty().withMessage('RFID UID is required'),
  body('deviceId').optional().trim(),
];

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

/**
 * POST /api/rfid/esp32/scan — ESP32 hardware RFID scan (API key auth, no JWT)
 * The ESP32 sends the raw UID read from the RFID card.
 * This endpoint maps the UID to a student and logs entry/exit.
 */
const scanFromESP32 = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, 'Validation failed', errors.array());
    }

    // Verify API key
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.ESP32_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      return sendResponse(res, 401, false, 'Invalid or missing API key.');
    }

    const { rfidUid, deviceId } = req.body;

    // 1. Find student by RFID UID (try exact match first, then hex match)
    let student = await prisma.student.findUnique({ where: { rfidUid } });

    // If not found by exact UID, try to find by a mapped UID
    // (students may have friendly IDs like "RFID-001-CS" but ESP32 reads hex like "A3B2C1D4")
    if (!student) {
      // Check the rfid_card_map table for a mapping
      const mapping = await prisma.rFIDCardMap.findUnique({ where: { hardwareUid: rfidUid } });
      if (mapping) {
        student = await prisma.student.findUnique({ where: { rfidUid: mapping.studentRfidUid } });
      }
    }

    if (!student) {
      console.log(`⚠️  Unregistered RFID card scanned: ${rfidUid} from device: ${deviceId || 'unknown'}`);
      return sendResponse(res, 404, false, 'Unregistered RFID card.', { scannedUid: rfidUid });
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
        rfidUid: student.rfidUid,  // Use the student's registered UID
        entryType,
        timestamp,
      },
    });

    // 5. Send email notification (if enabled)
    const emailNotify = process.env.RFID_EMAIL_NOTIFY === 'true';
    if (emailNotify) {
      sendRFIDEntryAlert(student, entryType, timestamp).catch(console.error);
    }

    console.log(`✅ ESP32 scan: ${entryType} — ${student.name} (${student.enrollmentNo}) from device: ${deviceId || 'unknown'}`);

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
    console.error('ESP32 RFID scan error:', error);
    return sendResponse(res, 500, false, 'RFID scan failed.');
  }
};

/**
 * POST /api/rfid/esp32/register-card — Map a hardware RFID UID to a student's RFID UID
 * Used to register a new physical card to a student account
 */
const registerCard = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.ESP32_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      return sendResponse(res, 401, false, 'Invalid or missing API key.');
    }

    const { hardwareUid, studentRfidUid } = req.body;

    if (!hardwareUid || !studentRfidUid) {
      return sendResponse(res, 400, false, 'Both hardwareUid and studentRfidUid are required.');
    }

    // Verify student exists with this rfidUid
    const student = await prisma.student.findUnique({ where: { rfidUid: studentRfidUid } });
    if (!student) {
      return sendResponse(res, 404, false, 'No student found with this RFID UID.');
    }

    // Upsert the mapping
    const mapping = await prisma.rFIDCardMap.upsert({
      where: { hardwareUid },
      update: { studentRfidUid },
      create: { hardwareUid, studentRfidUid },
    });

    return sendResponse(res, 200, true, `Card ${hardwareUid} mapped to student ${student.name}.`, mapping);
  } catch (error) {
    console.error('Register card error:', error);
    return sendResponse(res, 500, false, 'Failed to register card.');
  }
};

/**
 * PUT /api/rfid/esp32/assign-direct — Directly assign hardware UID as student's rfidUid
 * Simpler approach: just updates the student's rfidUid field with the ESP32-read UID
 */
const assignCardDirect = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.ESP32_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      return sendResponse(res, 401, false, 'Invalid or missing API key.');
    }

    const { hardwareUid, enrollmentNo } = req.body;

    if (!hardwareUid || !enrollmentNo) {
      return sendResponse(res, 400, false, 'Both hardwareUid and enrollmentNo are required.');
    }

    // Find student by enrollment number
    const student = await prisma.student.findUnique({ where: { enrollmentNo } });
    if (!student) {
      return sendResponse(res, 404, false, 'No student found with this enrollment number.');
    }

    // Check if this UID is already assigned to another student
    const existingStudent = await prisma.student.findUnique({ where: { rfidUid: hardwareUid } });
    if (existingStudent && existingStudent.id !== student.id) {
      return sendResponse(res, 409, false, `This card is already assigned to ${existingStudent.name} (${existingStudent.enrollmentNo}).`);
    }

    // Update student's RFID UID
    const updated = await prisma.student.update({
      where: { enrollmentNo },
      data: { rfidUid: hardwareUid },
    });

    console.log(`🏷️  Card ${hardwareUid} assigned to ${updated.name} (${updated.enrollmentNo})`);

    return sendResponse(res, 200, true, `Card assigned to ${updated.name} successfully.`, {
      student: {
        id: updated.id,
        name: updated.name,
        enrollmentNo: updated.enrollmentNo,
        department: updated.department,
        rfidUid: updated.rfidUid,
      },
    });
  } catch (error) {
    console.error('Assign card error:', error);
    return sendResponse(res, 500, false, 'Failed to assign card.');
  }
};

module.exports = {
  scanRFID,
  getAllLogs,
  getTodayLogs,
  getStudentLogs,
  scanValidation,
  scanFromESP32,
  esp32ScanValidation,
  registerCard,
  assignCardDirect,
};
