# 🔧 ESP32 + RFID Setup Guide — Library Management System

## 📦 Hardware Required

| Component | Quantity | Notes |
|-----------|----------|-------|
| ESP32 DevKit V1 (or similar) | 1 | Any ESP32 board with SPI |
| MFRC522 RFID Reader Module | 1 | Comes with RFID cards/tags |
| RFID Cards / Key Fobs | As needed | 13.56 MHz Mifare Classic |
| 16x2 LCD Display (I2C) | 1 | With I2C backpack module |
| Buzzer | 1 | Active buzzer |
| BC547 Transistor | 1 | To drive buzzer |
| Red LED (633nm) | 1 | Status indicator |
| Push Button Switch | 1 | To show system info |
| Resistors (330Ω) | 2 | R1 for LED, R2 for transistor base |
| Jumper Wires | ~15 | Male-to-Female |
| Breadboard | 1 | For prototyping |

---

## 🔌 Wiring Diagram

```
ESP32          MFRC522 RFID
─────          ────────────
GPIO 5   ───── SDA (SS)
GPIO 18  ───── SCK
GPIO 23  ───── MOSI
GPIO 19  ───── MISO
GPIO 27  ───── RST
3.3V     ───── 3.3V    ⚠️ DO NOT USE 5V!
GND      ───── GND

ESP32          16x2 LCD (I2C)
─────          ───────────────
GPIO 21  ───── SDA
GPIO 22  ───── SCL
5V (Vin) ───── VCC
GND      ───── GND

ESP32          Buzzer (via BC547 transistor)
─────          ────────────────────────────
GPIO 4   ───── R2 (330Ω) → BC547 Base
               BC547 Collector → Buzzer (-)
               BC547 Emitter → GND
               Buzzer (+) → 5V

ESP32          Red LED
─────          ───────
GPIO 2   ───── R1 (330Ω) → LED Anode (+)
               LED Cathode (-) → GND

ESP32          Push Button
─────          ───────────
GPIO 15  ───── Button Pin 1
GND      ───── Button Pin 2
```

> ⚠️ **Important**: The MFRC522 operates at **3.3V**. Do NOT connect it to 5V or it will be damaged!

---

## 🖥️ Arduino IDE Setup

### 1. Install ESP32 Board Package

1. Open Arduino IDE → **File → Preferences**
2. Add this URL to **Additional Boards Manager URLs**:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools → Board → Boards Manager**
4. Search "**ESP32**" and install **"esp32 by Espressif Systems"**

### 2. Install Required Libraries

Go to **Sketch → Include Library → Manage Libraries** and install:

| Library | Author | Version |
|---------|--------|---------|
| MFRC522 | GithubCommunity | 1.4.10+ |
| ArduinoJson | Benoit Blanchon | 7.x |
| LiquidCrystal_I2C | Frank de Brabander | 1.1.2+ |

### 3. Configure the Sketch

Open `esp32/rfid_scanner.ino` and update these values:

```cpp
// WiFi credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";       // ← Your WiFi name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";     // ← Your WiFi password

// Backend API URL
const char* SERVER_URL    = "http://192.168.1.100:5000";  // ← Your PC's local IP

// API key (must match ESP32_API_KEY in backend .env)
const char* API_KEY       = "esp32-library-secret-key-2026";
```

#### Finding Your PC's Local IP:
- **Windows**: Open CMD → type `ipconfig` → look for **IPv4 Address** under your WiFi adapter
- Example: `192.168.1.100`

### 4. Upload to ESP32

1. Connect ESP32 via USB
2. Select board: **Tools → Board → ESP32 Dev Module**
3. Select port: **Tools → Port → COM[X]** (your ESP32's port)
4. Click **Upload** ▶️

### 5. Monitor Output

Open **Tools → Serial Monitor** at **115200 baud** to see scan activity.

---

## 🔐 Backend Configuration

### 1. Environment Variable

The ESP32 authenticates using an API key (not JWT). Make sure your `.env` has:

```env
ESP32_API_KEY="esp32-library-secret-key-2026"
```

> Change this to a strong secret in production!

### 2. Create Database Migration

After pulling the code changes, run:

```bash
cd library-system/backend
npx prisma migrate dev --name add_rfid_card_map
```

This creates the `rfid_card_map` table for mapping hardware UIDs to student IDs.

---

## 🏷️ Two Ways to Use RFID Cards

### Option A: Direct Assignment (Recommended — Simpler)

Scan a card, then assign its hardware UID directly to a student:

```bash
# Replace the UID with what the ESP32 reads from the card
curl -X PUT http://localhost:5000/api/rfid/esp32/assign-direct \
  -H "Content-Type: application/json" \
  -H "X-API-Key: esp32-library-secret-key-2026" \
  -d '{"hardwareUid": "A3B2C1D4", "enrollmentNo": "CS2024001"}'
```

This updates the student's `rfidUid` in the database to the hardware UID.

### Option B: Card Mapping (For Existing Data)

If students already have friendly RFID UIDs (like `RFID-001-CS`), map the hardware UID:

```bash
curl -X POST http://localhost:5000/api/rfid/esp32/register-card \
  -H "Content-Type: application/json" \
  -H "X-API-Key: esp32-library-secret-key-2026" \
  -d '{"hardwareUid": "A3B2C1D4", "studentRfidUid": "RFID-001-CS"}'
```

---

## 📡 API Endpoints (ESP32)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/rfid/esp32/scan` | Log entry/exit when ESP32 scans a card |
| `POST` | `/api/rfid/esp32/register-card` | Map hardware UID → student's RFID UID |
| `PUT`  | `/api/rfid/esp32/assign-direct` | Assign hardware UID directly to student |

All ESP32 endpoints use `X-API-Key` header authentication (no JWT needed).

---

## 🧪 Testing Without Hardware

You can test the ESP32 endpoint using curl or Postman:

```bash
# Simulate an ESP32 scan
curl -X POST http://localhost:5000/api/rfid/esp32/scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: esp32-library-secret-key-2026" \
  -d '{"rfidUid": "RFID-001-CS", "deviceId": "ESP32-TEST"}'
```

---

## 🔄 How It Works (Flow)

```
┌─────────────┐    WiFi/HTTP     ┌──────────────────┐    Database     ┌──────────┐
│  ESP32 +    │───────────────── │  Node.js Backend  │──────────────── │ PostgreSQL│
│  MFRC522    │  POST /esp32/scan│  (Express API)    │  Prisma ORM    │ (Neon)   │
│  RFID Reader│ ◄─────────────── │                   │                 │          │
│             │  JSON response   │  Validates card   │                 │          │
└─────────────┘                  │  Logs entry/exit  │                 │          │
                                 │  Sends email      │                 │          │
      Student taps               └──────────────────┘                 └──────────┘
      RFID card                         │
                                        ▼
                                  ┌──────────────┐
                                  │ Web Dashboard │
                                  │ (React app)   │
                                  │ Shows live    │
                                  │ entry/exit    │
                                  │ feed          │
                                  └──────────────┘
```

1. Student taps RFID card on the RC522 reader
2. ESP32 reads the card's UID via SPI
3. ESP32 sends HTTP POST to `/api/rfid/esp32/scan` with the UID
4. Backend looks up the student, determines ENTRY or EXIT
5. Logs the scan in the database
6. Sends email notification (if enabled)
7. Returns student info + entry type to ESP32
8. ESP32 beeps + lights LED (green = success, red = error)
9. Web dashboard auto-refreshes and shows the new log

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| "MFRC522 not detected" | Check SPI wiring: SDA→GPIO5, SCK→GPIO18, MOSI→GPIO23, MISO→GPIO19, RST→GPIO27 |
| "WiFi connection failed" | Verify SSID/password. ESP32 supports 2.4GHz only (not 5GHz) |
| "HTTP error" | Ensure backend is running and ESP32 uses correct IP address |
| "Unregistered RFID card" | Use `/assign-direct` or `/register-card` to link the card to a student |
| "Invalid API key" | Match `API_KEY` in sketch with `ESP32_API_KEY` in `.env` |
| Cards not reading | Try moving card closer, ensure 3.3V power (not 5V) |
| LCD shows nothing | Try I2C address `0x3F` instead of `0x27` in the sketch (line 73) |
| LCD garbled text | Check SDA→GPIO21, SCL→GPIO22 wiring |
| Button not working | Ensure button connects GPIO15 to GND when pressed |
