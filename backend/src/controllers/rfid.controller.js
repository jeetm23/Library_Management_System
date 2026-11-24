const prisma = require('../prisma');
const { sendResponse, getTodayRange, getPagination, paginatedResponse } = require('../utils/helpers');
const { sendRFIDEntryAlert } = require('../services/email.service');
const { body, validationResult } = require('express-validator');

// ━━━━━━━━━━━ SSE: Real-time RFID scan broadcast to frontend ━━━━━━━━━━━
const sseClients = new Set();

// ★ Track last scanned student per ESP32 device (for 2-scan issue flow)
// Key: deviceId, Value: { student, timestamp }
const pendingStudents = new Map();
const PENDING_TIMEOUT_MS = 60000; // 60 seconds to scan book after student

/**
 * GET /api/rfid/esp32/stream — SSE stream for real-time RFID scans
 * Frontend connects here to receive live scan events pushed by ESP32.
 */
const rfidScanStream = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send a heartbeat immediately so client knows it's connected
  res.write('data: {"type":"connected"}\n\n');

  sseClients.add(res);
  console.log(`📡 SSE client connected (total: ${sseClients.size})`);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write('data: {"type":"heartbeat"}\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
    console.log(`📡 SSE client disconnected (total: ${sseClients.size})`);
  });
};

/**
 * Broadcast an event to all connected SSE clients
 */
const broadcastEvent = (eventData) => {
  const event = JSON.stringify(eventData);
  for (const client of sseClients) {
    client.write(`data: ${event}\n\n`);
  }
  console.log(`📡 Broadcasted ${eventData.type} to ${sseClients.size} client(s)`);
};

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
 * 
 * ★ TWO-SCAN FLOW:
 *   Scan 1: Student RFID card → identifies student, stores as "pending"
 *   Scan 2: Book RFID keychain → auto-issues the book to the pending student
 *
 * The endpoint checks if the UID belongs to a student or a book:
 *   - Student card → store student, broadcast to frontend, return student info
 *   - Book keychain → find pending student, issue book, broadcast result
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
    const device = deviceId || 'ESP32-RFID-01';

    // ━━━━━━━━━ Step 1: Check if this UID is a BOOK ━━━━━━━━━
    const book = await prisma.book.findUnique({ where: { rfidUid } });

    if (book) {
      // This is a BOOK scan — try to issue it to the pending student
      const pending = pendingStudents.get(device);

      if (!pending || (Date.now() - pending.timestamp) > PENDING_TIMEOUT_MS) {
        // No student scanned recently
        pendingStudents.delete(device);
        broadcastEvent({ type: 'book_scan_no_student', rfidUid, book: { id: book.id, title: book.title, author: book.author } });
        console.log(`⚠️  Book "${book.title}" scanned but no student pending on ${device}`);
        return sendResponse(res, 400, false, 'Scan a student card first, then scan the book.', {
          scanType: 'book',
          book: { id: book.id, title: book.title, author: book.author },
        });
      }

      const student = pending.student;

      // Check if book has available copies
      if (book.availableCopies <= 0) {
        broadcastEvent({ type: 'book_unavailable', rfidUid, book: { id: book.id, title: book.title } });
        return sendResponse(res, 400, false, `No copies available for "${book.title}".`, {
          scanType: 'book',
          book: { id: book.id, title: book.title, availableCopies: 0 },
        });
      }

      // Check if student already has this book
      const existingIssue = await prisma.bookIssue.findFirst({
        where: { studentId: student.id, bookId: book.id, status: { in: ['ISSUED', 'OVERDUE'] } },
      });

      if (existingIssue) {
        broadcastEvent({ type: 'book_already_issued', student: { name: student.name }, book: { title: book.title } });
        return sendResponse(res, 400, false, `${student.name} already has "${book.title}" issued.`);
      }

      // ★ AUTO-ISSUE the book to the student!
      const issueDays = parseInt(process.env.DEFAULT_ISSUE_DAYS) || 14;
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + issueDays);

      const [issue] = await prisma.$transaction([
        prisma.bookIssue.create({
          data: {
            studentId: student.id,
            bookId: book.id,
            issueDate,
            dueDate,
            issuedBy: 1, // System/ESP32 auto-issue
          },
          include: { student: true, book: true },
        }),
        prisma.book.update({
          where: { id: book.id },
          data: { availableCopies: { decrement: 1 } },
        }),
      ]);

      // Create notification
      await prisma.notification.create({
        data: {
          studentId: student.id,
          type: 'ISSUE_CONFIRMATION',
          message: `Book "${book.title}" issued via RFID. Due: ${dueDate.toLocaleDateString()}.`,
        },
      });

      // Clear the pending student
      pendingStudents.delete(device);

      // Broadcast to frontend
      broadcastEvent({
        type: 'book_issued',
        student: { id: student.id, name: student.name, enrollmentNo: student.enrollmentNo, department: student.department },
        book: { id: book.id, title: book.title, author: book.author, isbn: book.isbn },
        issueDate: issueDate.toISOString(),
        dueDate: dueDate.toISOString(),
      });

      console.log(`📚 AUTO-ISSUED: "${book.title}" → ${student.name} (${student.enrollmentNo}) via ${device}`);

      return sendResponse(res, 201, true, `Book "${book.title}" issued to ${student.name}!`, {
        scanType: 'book_issued',
        student: { id: student.id, name: student.name, enrollmentNo: student.enrollmentNo, department: student.department },
        book: { id: book.id, title: book.title, author: book.author },
        issueDate,
        dueDate,
      });
    }

    // ━━━━━━━━━ Step 2: Check if this UID is a STUDENT ━━━━━━━━━
    let student = await prisma.student.findUnique({ where: { rfidUid } });

    // Try mapped UID if not found
    if (!student) {
      const mapping = await prisma.rFIDCardMap.findUnique({ where: { hardwareUid: rfidUid } });
      if (mapping) {
        student = await prisma.student.findUnique({ where: { rfidUid: mapping.studentRfidUid } });
      }
    }

    if (!student) {
      console.log(`⚠️  Unregistered RFID card scanned: ${rfidUid} from device: ${device}`);
      broadcastEvent({ type: 'rfid_scan', rfidUid, found: false });
      return sendResponse(res, 404, false, 'Unregistered RFID card.', { scannedUid: rfidUid });
    }

    if (!student.isActive) {
      return sendResponse(res, 400, false, 'Student account is inactive.');
    }

    // ★ Store as pending student for book scan
    pendingStudents.set(device, { student, timestamp: Date.now() });

    // Broadcast student scan to frontend
    broadcastEvent({
      type: 'student_scanned',
      rfidUid,
      student: { id: student.id, name: student.name, enrollmentNo: student.enrollmentNo, department: student.department },
    });

    console.log(`👤 Student scanned: ${student.name} (${student.enrollmentNo}) — waiting for book scan on ${device}...`);

    return sendResponse(res, 200, true, `Student: ${student.name}. Now scan the book to issue.`, {
      scanType: 'student',
      student: { id: student.id, name: student.name, enrollmentNo: student.enrollmentNo, department: student.department },
      message: 'Now scan the book RFID tag to issue it.',
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
  rfidScanStream,
};
