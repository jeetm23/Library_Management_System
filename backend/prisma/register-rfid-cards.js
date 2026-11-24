/**
 * Register RFID cards for new students
 * Run: node prisma/register-rfid-cards.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🏷️  Registering RFID cards...\n');

  // Student 1: Bhargavi Patil → Card 632C8D14
  const student1 = await prisma.student.upsert({
    where: { enrollmentNo: 'BT240046ET' },
    update: { rfidUid: '632C8D14' },
    create: {
      name: 'Bhargavi Patil',
      email: 'bhargavi.patil@student.edu',
      department: 'Electronics & Telecommunication',
      enrollmentNo: 'BT240046ET',
      rfidUid: '632C8D14',
    },
  });
  console.log(`✅ Card 1 (632C8D14) → ${student1.name} (${student1.enrollmentNo})`);

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

  console.log('\n🎉 Done! Both cards are registered. You can now scan them on the ESP32.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
  })
  .finally(() => prisma.$disconnect());
