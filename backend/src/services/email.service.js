const nodemailer = require('nodemailer');

/**
 * Email Service — All library notification emails via Nodemailer
 */

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 5000, // 5 seconds
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
};

// Common email wrapper template
const emailWrapper = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">📚 College Library</h1>
              <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Library Management System</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fc;padding:24px 40px;text-align:center;border-top:1px solid #e8ecf1;">
              <p style="color:#8e99a4;margin:0;font-size:12px;">
                This is an automated email from the Library Management System.<br>
                Please do not reply to this email. For queries, contact the library desk.
              </p>
              <p style="color:#b0b8c1;margin:8px 0 0;font-size:11px;">
                &copy; ${new Date().getFullYear()} College Library • All rights reserved
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Info row helper
const infoRow = (label, value) => `
  <tr>
    <td style="padding:8px 0;color:#6b7280;font-size:14px;width:140px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:#1f2937;font-size:14px;font-weight:600;">${value}</td>
  </tr>
`;

/**
 * Send email helper (catches errors silently to not break main flow)
 */
const sendMail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Library System <noreply@library.edu>',
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${subject}`);
    return result;
  } catch (error) {
    console.error(`❌ Email failed to ${to}:`, error.message);
    return null;
  }
};

// ━━━━━━━━━━━━━━━ EMAIL TEMPLATES ━━━━━━━━━━━━━━━

/**
 * 1. Issue Confirmation Email
 */
const sendIssueConfirmation = async (student, book, issueDate, dueDate) => {
  const formattedIssue = new Date(issueDate).toLocaleDateString('en-IN', { dateStyle: 'long' });
  const formattedDue = new Date(dueDate).toLocaleDateString('en-IN', { dateStyle: 'long' });

  const content = `
    <h2 style="color:#1f2937;margin:0 0 8px;font-size:20px;">📚 Book Issued Successfully</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">
      Dear <strong>${student.name}</strong>, the following book has been issued to you.
    </p>
    
    <div style="background-color:#f0fdf4;border-left:4px solid #22c55e;border-radius:8px;padding:20px;margin-bottom:24px;">
      <h3 style="color:#166534;margin:0 0 4px;font-size:16px;">${book.title}</h3>
      <p style="color:#4b5563;margin:0;font-size:13px;">by ${book.author}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${infoRow('📖 Book Title', book.title)}
      ${infoRow('✍️ Author', book.author)}
      ${infoRow('🔢 ISBN', book.isbn)}
      ${infoRow('📅 Issue Date', formattedIssue)}
      ${infoRow('⏰ Due Date', formattedDue)}
      ${infoRow('📍 Shelf Location', book.shelfLocation || 'N/A')}
      ${infoRow('🏫 Department', student.department)}
      ${infoRow('🎓 Enrollment No.', student.enrollmentNo)}
    </table>

    <div style="background-color:#fefce8;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="color:#854d0e;margin:0;font-size:13px;">
        ⚠️ <strong>Important:</strong> Please return the book by <strong>${formattedDue}</strong> to avoid overdue fines.
        Late returns will be charged at ₹${process.env.FINE_PER_DAY || 2}/day.
      </p>
    </div>
  `;

  return sendMail(student.email, `📚 Book Issued: ${book.title}`, emailWrapper('Book Issued', content));
};

/**
 * 2. Return Confirmation Email
 */
const sendReturnConfirmation = async (student, book, returnDate, fineAmount = 0) => {
  const formattedReturn = new Date(returnDate).toLocaleDateString('en-IN', { dateStyle: 'long' });

  const fineSection = fineAmount > 0
    ? `<div style="background-color:#fef2f2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="color:#991b1b;margin:0;font-size:14px;">
          💰 <strong>Fine Amount: ₹${fineAmount.toFixed(2)}</strong><br>
          <span style="font-size:12px;">Please pay the fine at the library counter.</span>
        </p>
      </div>`
    : `<div style="background-color:#f0fdf4;border-left:4px solid #22c55e;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="color:#166534;margin:0;font-size:14px;">✅ No fines applicable. Thank you for returning on time!</p>
      </div>`;

  const content = `
    <h2 style="color:#1f2937;margin:0 0 8px;font-size:20px;">✅ Book Returned Successfully</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">
      Dear <strong>${student.name}</strong>, your book return has been processed.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      ${infoRow('📖 Book Title', book.title)}
      ${infoRow('✍️ Author', book.author)}
      ${infoRow('📅 Return Date', formattedReturn)}
      ${infoRow('🎓 Student', student.name)}
      ${infoRow('🔢 Enrollment', student.enrollmentNo)}
    </table>

    ${fineSection}

    <div style="background-color:#f8f9fc;border-radius:8px;padding:16px;">
      <p style="color:#4b5563;margin:0;font-size:13px;">
        📋 <strong>Receipt Summary</strong><br>
        Book: ${book.title} | Returned: ${formattedReturn} | Fine: ₹${fineAmount.toFixed(2)}
      </p>
    </div>
  `;

  return sendMail(student.email, `✅ Book Returned: ${book.title}`, emailWrapper('Book Returned', content));
};

/**
 * 3. Due Reminder Email
 */
const sendDueReminder = async (student, book, dueDate, daysRemaining) => {
  const formattedDue = new Date(dueDate).toLocaleDateString('en-IN', { dateStyle: 'long' });

  const content = `
    <h2 style="color:#1f2937;margin:0 0 8px;font-size:20px;">⏰ Book Due Reminder</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">
      Dear <strong>${student.name}</strong>, your borrowed book is due soon.
    </p>

    <div style="background-color:#fff7ed;border-left:4px solid #f59e0b;border-radius:8px;padding:20px;margin-bottom:24px;">
      <h3 style="color:#92400e;margin:0 0 4px;font-size:18px;">
        ${daysRemaining === 1 ? '⚡ Due Tomorrow!' : `📅 Due in ${daysRemaining} Days`}
      </h3>
      <p style="color:#78350f;margin:0;font-size:14px;">
        <strong>${book.title}</strong> by ${book.author}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${infoRow('📖 Book Title', book.title)}
      ${infoRow('✍️ Author', book.author)}
      ${infoRow('📅 Due Date', formattedDue)}
      ${infoRow('⏳ Days Remaining', `${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`)}
    </table>

    <div style="background-color:#fefce8;border-radius:8px;padding:16px;">
      <p style="color:#854d0e;margin:0;font-size:13px;">
        💡 <strong>Tip:</strong> Return the book on time to avoid overdue fines (₹${process.env.FINE_PER_DAY || 2}/day).
        Visit the library counter or contact us for renewal options.
      </p>
    </div>
  `;

  return sendMail(student.email, `⏰ Book Due in ${daysRemaining} Days: ${book.title}`, emailWrapper('Due Reminder', content));
};

/**
 * 4. Overdue Alert Email
 */
const sendOverdueAlert = async (student, book, dueDate, daysOverdue, fineAccrued) => {
  const formattedDue = new Date(dueDate).toLocaleDateString('en-IN', { dateStyle: 'long' });

  const content = `
    <h2 style="color:#dc2626;margin:0 0 8px;font-size:20px;">🚨 Overdue Book Alert</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">
      Dear <strong>${student.name}</strong>, the following book is <strong>overdue</strong>.
    </p>

    <div style="background-color:#fef2f2;border-left:4px solid #ef4444;border-radius:8px;padding:20px;margin-bottom:24px;">
      <h3 style="color:#991b1b;margin:0 0 8px;font-size:18px;">
        ⚠️ ${daysOverdue} Day${daysOverdue > 1 ? 's' : ''} Overdue
      </h3>
      <p style="color:#7f1d1d;margin:0;font-size:16px;font-weight:700;">
        Current Fine: ₹${fineAccrued.toFixed(2)}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${infoRow('📖 Book Title', book.title)}
      ${infoRow('✍️ Author', book.author)}
      ${infoRow('📅 Due Date', formattedDue)}
      ${infoRow('🔴 Days Overdue', `${daysOverdue} days`)}
      ${infoRow('💰 Fine Accrued', `₹${fineAccrued.toFixed(2)}`)}
      ${infoRow('📊 Fine Rate', `₹${process.env.FINE_PER_DAY || 2}/day`)}
    </table>

    <div style="background-color:#fef2f2;border-radius:8px;padding:16px;">
      <p style="color:#991b1b;margin:0;font-size:13px;">
        🏃 <strong>Action Required:</strong> Please return the book immediately to stop further fine accumulation.
        Visit the library counter during working hours (9:00 AM - 5:00 PM).
      </p>
    </div>
  `;

  return sendMail(student.email, `🚨 Overdue Book Alert: ${book.title}`, emailWrapper('Overdue Alert', content));
};

/**
 * 5. Fine Notice Email
 */
const sendFineNotice = async (student, book, fineAmount, fineId) => {
  const content = `
    <h2 style="color:#1f2937;margin:0 0 8px;font-size:20px;">💰 Library Fine Notice</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">
      Dear <strong>${student.name}</strong>, a fine has been applied to your account.
    </p>

    <div style="background-color:#fef2f2;border:2px solid #fca5a5;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="color:#6b7280;margin:0 0 4px;font-size:14px;">Total Fine Amount</p>
      <h2 style="color:#dc2626;margin:0;font-size:36px;font-weight:800;">₹${fineAmount.toFixed(2)}</h2>
      <p style="color:#9ca3af;margin:4px 0 0;font-size:12px;">Fine ID: #${fineId}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${infoRow('📖 Book', book.title)}
      ${infoRow('✍️ Author', book.author)}
      ${infoRow('🎓 Student', student.name)}
      ${infoRow('🔢 Enrollment', student.enrollmentNo)}
      ${infoRow('💰 Fine Amount', `₹${fineAmount.toFixed(2)}`)}
      ${infoRow('📊 Rate', `₹${process.env.FINE_PER_DAY || 2}/day`)}
    </table>

    <div style="background-color:#fefce8;border-radius:8px;padding:16px;">
      <p style="color:#854d0e;margin:0;font-size:13px;">
        🏦 <strong>Payment:</strong> Please pay the fine at the library counter during working hours.
        Unpaid fines may restrict future book borrowing.
      </p>
    </div>
  `;

  return sendMail(student.email, `💰 Library Fine: ₹${fineAmount.toFixed(2)}`, emailWrapper('Fine Notice', content));
};

/**
 * 6. RFID Entry/Exit Alert Email
 */
const sendRFIDEntryAlert = async (student, entryType, timestamp) => {
  const formattedTime = new Date(timestamp).toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const isEntry = entryType === 'ENTRY';
  const emoji = isEntry ? '🏫' : '🚪';
  const color = isEntry ? '#22c55e' : '#f59e0b';
  const bgColor = isEntry ? '#f0fdf4' : '#fefce8';
  const textColor = isEntry ? '#166534' : '#854d0e';

  const content = `
    <h2 style="color:#1f2937;margin:0 0 8px;font-size:20px;">${emoji} Library ${entryType} Recorded</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">
      Dear <strong>${student.name}</strong>, your library ${entryType.toLowerCase()} has been recorded.
    </p>

    <div style="background-color:${bgColor};border-left:4px solid ${color};border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
      <h3 style="color:${textColor};margin:0 0 8px;font-size:22px;">
        ${isEntry ? '✅ Entry Recorded' : '👋 Exit Recorded'}
      </h3>
      <p style="color:${textColor};margin:0;font-size:14px;">
        <strong>${formattedTime}</strong>
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${infoRow('👤 Student', student.name)}
      ${infoRow('🎓 Enrollment', student.enrollmentNo)}
      ${infoRow('🏢 Department', student.department)}
      ${infoRow(`${emoji} Type`, entryType)}
      ${infoRow('🕐 Time', formattedTime)}
    </table>
  `;

  return sendMail(
    student.email,
    `${emoji} Library ${entryType === 'ENTRY' ? 'Entry' : 'Exit'} Recorded`,
    emailWrapper(`Library ${entryType}`, content)
  );
};

module.exports = {
  sendIssueConfirmation,
  sendReturnConfirmation,
  sendDueReminder,
  sendOverdueAlert,
  sendFineNotice,
  sendRFIDEntryAlert,
};
