/**
 * Assign RFID keychain UID to a book
 * Usage: node prisma/assign-book-rfid.js
 * 
 * This assigns the keychain UID 632C8D14 to the first available book.
 * Run once to register the book keychain.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🏷️  Assigning RFID keychain to book...\n');

  // List all books that don't have an RFID tag yet
  const books = await prisma.book.findMany({
    where: { rfidUid: null },
    select: { id: true, title: true, author: true, isbn: true, availableCopies: true },
    orderBy: { id: 'asc' },
  });

  if (books.length === 0) {
    console.log('No books without RFID tags found.');

    // Show all books
    const allBooks = await prisma.book.findMany({
      select: { id: true, title: true, rfidUid: true },
      orderBy: { id: 'asc' },
    });
    console.log('\nAll books:');
    allBooks.forEach((b) => {
      console.log(`  ${b.id}. ${b.title} → RFID: ${b.rfidUid || 'none'}`);
    });
    return;
  }

  console.log('Available books (no RFID tag assigned):');
  books.forEach((b) => {
    console.log(`  ${b.id}. "${b.title}" by ${b.author} (${b.availableCopies} copies available)`);
  });

  // Assign keychain 632C8D14 to the FIRST book
  const targetBook = books[0];
  const KEYCHAIN_UID = '632C8D14';

  const updated = await prisma.book.update({
    where: { id: targetBook.id },
    data: { rfidUid: KEYCHAIN_UID },
  });

  console.log(`\n✅ Keychain (${KEYCHAIN_UID}) → "${updated.title}" (ID: ${updated.id})`);
  console.log('\n🎉 Done! Now scan student card first, then scan this keychain to auto-issue!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
  })
  .finally(() => prisma.$disconnect());
