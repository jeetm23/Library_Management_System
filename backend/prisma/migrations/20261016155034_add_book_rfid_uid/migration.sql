-- AlterTable
ALTER TABLE "books" ADD COLUMN "rfidUid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "books_rfidUid_key" ON "books"("rfidUid");
