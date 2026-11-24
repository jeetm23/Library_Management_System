/**
 * Register RFID cards for students
 * Run: node prisma/register-rfid-cards.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🏷️  Registering RFID cards...\n');

  // Student 1: Bhargavi Patil → Card E06AEE5F
  const student1 = await prisma.student.upsert({
    where: { enrollmentNo: 'BT240046ET' },
    update: { rfidUid: 'E06AEE5F' },
    create: {
      name: 'Bhargavi Patil',
      email: 'bhargavi.patil@student.edu',
      department: 'Electronics & Telecommunication',
      enrollmentNo: 'BT240046ET',
      rfidUid: 'E06AEE5F',
    },
  });
  console.log(`✅ Card 1 (E06AEE5F) → ${student1.name} (${student1.enrollmentNo})`);

  // Student 2: Jeet Mohod → Card FF447ACB
  const student2 = await prisma.student.upsert({
    where: { enrollmentNo: 'BT240038ET' },
    update: { rfidUid: 'FF447ACB' },
    create: {
      name: 'Jeet Mohod',
      email: 'jeet.mohod@student.edu',
      department: 'Electronics & Telecommunication',
      enrollmentNo: 'BT240038ET',
      rfidUid: 'FF447ACB',
    },
  });
  console.log(`✅ Card 2 (FF447ACB) → ${student2.name} (${student2.enrollmentNo})`);

  console.log('\n🎉 Done! Both cards are registered. Scan them on ESP32 now!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
  })
  .finally(() => prisma.$disconnect());
