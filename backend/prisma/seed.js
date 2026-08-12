const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ━━━━━━━━━━ USERS ━━━━━━━━━━
  const adminPassword = await bcrypt.hash('admin123', 10);
  const librarianPassword = await bcrypt.hash('librarian123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@library.edu' },
    update: {},
    create: {
      name: 'Dr. Rajesh Kumar',
      email: 'admin@library.edu',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const librarian = await prisma.user.upsert({
    where: { email: 'librarian@library.edu' },
    update: {},
    create: {
      name: 'Priya Sharma',
      email: 'librarian@library.edu',
      password: librarianPassword,
      role: 'LIBRARIAN',
    },
  });

  console.log('✅ Users created:', admin.name, '&', librarian.name);

  // ━━━━━━━━━━ STUDENTS ━━━━━━━━━━
  const studentsData = [
    {
      name: 'Aarav Patel',
      email: 'aarav.patel@student.edu',
      phone: '9876543210',
      department: 'Computer Science',
      rfidUid: 'RFID-001-CS',
      enrollmentNo: 'CS2024001',
    },
    {
      name: 'Ananya Singh',
      email: 'ananya.singh@student.edu',
      phone: '9876543211',
      department: 'Electronics',
      rfidUid: 'RFID-002-EC',
      enrollmentNo: 'EC2024002',
    },
    {
      name: 'Rohan Gupta',
      email: 'rohan.gupta@student.edu',
      phone: '9876543212',
      department: 'Mechanical',
      rfidUid: 'RFID-003-ME',
      enrollmentNo: 'ME2024003',
    },
    {
      name: 'Diya Reddy',
      email: 'diya.reddy@student.edu',
      phone: '9876543213',
      department: 'Computer Science',
      rfidUid: 'RFID-004-CS',
      enrollmentNo: 'CS2024004',
    },
    {
      name: 'Kabir Mehta',
      email: 'kabir.mehta@student.edu',
      phone: '9876543214',
      department: 'Civil',
      rfidUid: 'RFID-005-CE',
      enrollmentNo: 'CE2024005',
    },
  ];

  for (const s of studentsData) {
    await prisma.student.upsert({
      where: { email: s.email },
      update: {},
      create: s,
    });
  }
  console.log('✅ 5 Students created');

  // ━━━━━━━━━━ BOOKS ━━━━━━━━━━
  const booksData = [
    {
      title: 'Introduction to Algorithms',
      author: 'Thomas H. Cormen',
      isbn: '978-0262033848',
      category: 'Computer Science',
      publisher: 'MIT Press',
      totalCopies: 5,
      availableCopies: 5,
      shelfLocation: 'A1-01',
    },
    {
      title: 'Clean Code',
      author: 'Robert C. Martin',
      isbn: '978-0132350884',
      category: 'Computer Science',
      publisher: 'Prentice Hall',
      totalCopies: 3,
      availableCopies: 3,
      shelfLocation: 'A1-02',
    },
    {
      title: 'The Pragmatic Programmer',
      author: 'David Thomas & Andrew Hunt',
      isbn: '978-0135957059',
      category: 'Computer Science',
      publisher: 'Addison-Wesley',
      totalCopies: 4,
      availableCopies: 4,
      shelfLocation: 'A1-03',
    },
    {
      title: 'Engineering Mechanics',
      author: 'R.C. Hibbeler',
      isbn: '978-0133918922',
      category: 'Mechanical',
      publisher: 'Pearson',
      totalCopies: 6,
      availableCopies: 6,
      shelfLocation: 'B2-01',
    },
    {
      title: 'Digital Electronics',
      author: 'Morris Mano',
      isbn: '978-0132774208',
      category: 'Electronics',
      publisher: 'Pearson',
      totalCopies: 4,
      availableCopies: 4,
      shelfLocation: 'C1-01',
    },
    {
      title: 'Database System Concepts',
      author: 'Abraham Silberschatz',
      isbn: '978-0078022159',
      category: 'Computer Science',
      publisher: 'McGraw-Hill',
      totalCopies: 3,
      availableCopies: 3,
      shelfLocation: 'A1-04',
    },
    {
      title: 'Structural Analysis',
      author: 'R.C. Hibbeler',
      isbn: '978-0134610672',
      category: 'Civil',
      publisher: 'Pearson',
      totalCopies: 3,
      availableCopies: 3,
      shelfLocation: 'D1-01',
    },
    {
      title: 'Operating System Concepts',
      author: 'Abraham Silberschatz',
      isbn: '978-1119800361',
      category: 'Computer Science',
      publisher: 'Wiley',
      totalCopies: 5,
      availableCopies: 5,
      shelfLocation: 'A1-05',
    },
    {
      title: 'Signals and Systems',
      author: 'Alan V. Oppenheim',
      isbn: '978-0138147570',
      category: 'Electronics',
      publisher: 'Pearson',
      totalCopies: 4,
      availableCopies: 4,
      shelfLocation: 'C1-02',
    },
    {
      title: 'Fluid Mechanics',
      author: 'Frank M. White',
      isbn: '978-0073398273',
      category: 'Mechanical',
      publisher: 'McGraw-Hill',
      totalCopies: 3,
      availableCopies: 3,
      shelfLocation: 'B2-02',
    },
  ];

  for (const b of booksData) {
    await prisma.book.upsert({
      where: { isbn: b.isbn },
      update: {},
      create: b,
    });
  }
  console.log('✅ 10 Books created');

  console.log('\n🎉 Seed completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin Login  → admin@library.edu / admin123');
  console.log('Lib. Login   → librarian@library.edu / librarian123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
