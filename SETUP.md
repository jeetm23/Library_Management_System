# 📚 College Library Management System — Setup Guide

## Prerequisites

- **Node.js** 18+ and **npm** 9+
- **PostgreSQL** 14+ running locally or remotely
- A PostgreSQL database (e.g., `library_db`)

---

## 1. Clone & Configure

```bash
cd library-system
```

### Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your actual database URL and SMTP credentials:
```
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/library_db"
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
```

---

## 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in a new terminal)
cd frontend
npm install
```

---

## 3. Database Setup

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# Seed the database (5 students, 10 books, 2 users)
npx prisma db seed
```

### Seed Credentials
| Role      | Email                    | Password       |
|-----------|--------------------------|----------------|
| Admin     | admin@library.edu        | admin123       |
| Librarian | librarian@library.edu    | librarian123   |

---

## 4. Start the Application

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser and log in with the credentials above.

---

## 5. RFID Setup

### Register an RFID UID to a Student

Use the **Students** page in the UI:
1. Go to **Students** → Click **Edit** on any student
2. Enter an RFID UID (e.g., `RFID-001-CS`) in the RFID field
3. Click **Update**

Or via API:
```bash
curl -X PUT http://localhost:5000/api/students/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rfidUid": "RFID-001-CS", "name": "Aarav Patel", "email": "aarav.patel@student.edu", "department": "Computer Science", "enrollmentNo": "CS2024001"}'
```

### Test RFID Scan

Via the **RFID Panel** page in the UI, enter a registered RFID UID and click **Scan**.

Or via curl/Postman:
```bash
# First scan — ENTRY
curl -X POST http://localhost:5000/api/rfid/scan \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rfidUid": "RFID-001-CS"}'

# Second scan — EXIT
curl -X POST http://localhost:5000/api/rfid/scan \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rfidUid": "RFID-001-CS"}'
```

---

## 6. Get a JWT Token (for API testing)

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@library.edu", "password": "admin123"}'
```

Copy `accessToken` from the response and use it as `Bearer YOUR_JWT_TOKEN` in subsequent requests.

---

## 7. Prisma Studio (Database GUI)

```bash
cd backend
npx prisma studio
```

Opens a browser-based database GUI at **http://localhost:5555**.

---

## 8. Environment Variables Reference

| Variable               | Description                        | Default                    |
|------------------------|------------------------------------|----------------------------|
| `DATABASE_URL`         | PostgreSQL connection string       | *required*                 |
| `JWT_SECRET`           | Access token secret                | *required*                 |
| `JWT_REFRESH_SECRET`   | Refresh token secret               | *required*                 |
| `JWT_EXPIRES_IN`       | Access token expiry                | `15m`                      |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry             | `7d`                       |
| `SMTP_HOST`            | Email SMTP host                    | `smtp.gmail.com`           |
| `SMTP_PORT`            | Email SMTP port                    | `587`                      |
| `SMTP_USER`            | SMTP username                      | *required for email*       |
| `SMTP_PASS`            | SMTP app password                  | *required for email*       |
| `EMAIL_FROM`           | From address for emails            | `Library System <...>`     |
| `FINE_PER_DAY`         | Fine rate per overdue day (₹)      | `2`                        |
| `GRACE_PERIOD_DAYS`    | Days of grace before fine starts   | `0`                        |
| `DEFAULT_ISSUE_DAYS`   | Default book issue duration        | `14`                       |
| `RFID_EMAIL_NOTIFY`    | Send emails on RFID scan           | `true`                     |
| `PORT`                 | Backend server port                | `5000`                     |
| `CLIENT_URL`           | Frontend origin for CORS           | `http://localhost:5173`    |

---

## 9. API Overview

| Endpoint                    | Method | Auth | Description                     |
|-----------------------------|--------|------|---------------------------------|
| `/api/auth/register`        | POST   | No   | Register user                   |
| `/api/auth/login`           | POST   | No   | Login                           |
| `/api/auth/refresh`         | POST   | No   | Refresh JWT                     |
| `/api/students`             | GET    | Yes  | List students (paginated)       |
| `/api/students`             | POST   | Yes  | Add student                     |
| `/api/books`                | GET    | Yes  | List books (paginated)          |
| `/api/books`                | POST   | Yes  | Add book                        |
| `/api/books/search?q=`      | GET    | Yes  | Search books                    |
| `/api/issues`               | POST   | Yes  | Issue a book                    |
| `/api/issues/:id/return`    | PUT    | Yes  | Return a book                   |
| `/api/issues/overdue`       | GET    | Yes  | List overdue issues             |
| `/api/fines`                | GET    | Yes  | List fines (admin)              |
| `/api/fines/:id/pay`        | PUT    | Yes  | Mark fine as paid               |
| `/api/rfid/scan`            | POST   | Yes  | Simulate RFID scan              |
| `/api/rfid/logs/today`      | GET    | Yes  | Today's RFID logs               |
| `/api/dashboard/stats`      | GET    | Yes  | Dashboard statistics            |
| `/api/reports/monthly-issues` | GET  | Yes  | Monthly issue chart data        |
| `/api/reports/top-books`    | GET    | Yes  | Top 10 most issued books        |
| `/api/notifications`        | GET    | Yes  | All notifications               |

---

## Scheduled Tasks (Automatic)

| Schedule            | Task                                |
|---------------------|-------------------------------------|
| Daily 9:00 AM       | Send due reminders (books due tomorrow) |
| Daily 10:00 AM      | Check overdue, update status, send alerts |
| Monday 8:00 AM      | Weekly summary report               |
