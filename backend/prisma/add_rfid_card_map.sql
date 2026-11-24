-- CreateTable rfid_card_map
CREATE TABLE IF NOT EXISTS "rfid_card_map" (
    "id" SERIAL NOT NULL,
    "hardwareUid" TEXT NOT NULL,
    "studentRfidUid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rfid_card_map_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "rfid_card_map_hardwareUid_key" ON "rfid_card_map"("hardwareUid");
