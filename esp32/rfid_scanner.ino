/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *   ESP32 + RC522 RFID Scanner for Library System
 *   With 16x2 LCD, Buzzer, LED & Push Button
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  Hardware Wiring (matching your circuit diagram):
 *
 *  ┌─────────────────────────────────────────────────┐
 *  │ MFRC522 RFID    │ ESP32                        │
 *  ├─────────────────┼──────────────────────────────│
 *  │ SDA (SS)        │ GPIO  5                      │
 *  │ SCK             │ GPIO 18                      │
 *  │ MOSI            │ GPIO 23                      │
 *  │ MISO            │ GPIO 19                      │
 *  │ RST             │ GPIO 27                      │
 *  │ 3.3V            │ 3.3V                         │
 *  │ GND             │ GND                          │
 *  ├─────────────────┼──────────────────────────────│
 *  │ 16x2 LCD (I2C)  │ ESP32                        │
 *  ├─────────────────┼──────────────────────────────│
 *  │ SDA             │ GPIO 21                      │
 *  │ SCL             │ GPIO 22                      │
 *  │ VCC             │ 5V (Vin)                     │
 *  │ GND             │ GND                          │
 *  ├─────────────────┼──────────────────────────────│
 *  │ Buzzer          │ BC547 Base → R2(330Ω) → GPIO 4│
 *  │ Red LED         │ R1(330Ω) → GPIO 2            │
 *  │ Push Button     │ GPIO 15 → GND                │
 *  └─────────────────┴──────────────────────────────┘
 *
 *  Required Libraries (install via Arduino Library Manager):
 *  - MFRC522 by GithubCommunity (v1.4.10+)
 *  - ArduinoJson by Benoit Blanchon (v7.x)
 *  - LiquidCrystal_I2C by Frank de Brabander
 *  - WiFi (built-in with ESP32 board package)
 *  - HTTPClient (built-in with ESP32 board package)
 */

#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ━━━━━━━━━━━━━━━ CONFIGURATION ━━━━━━━━━━━━━━━
// ⚠️ CHANGE THESE VALUES TO MATCH YOUR SETUP

// WiFi credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";       // ← Change this
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";     // ← Change this

// Backend API URL — use your computer's local IP or Render URL
// For local development:  "http://192.168.1.100:5000"
// For Render deployment:  "https://your-app.onrender.com"
const char* SERVER_URL    = "http://192.168.1.100:5000";  // ← Change this

// ESP32 API key (must match ESP32_API_KEY in your backend .env)
const char* API_KEY       = "esp32-library-secret-key-2026";  // ← Change this

// ━━━━━━━━━━━━━━━ PIN DEFINITIONS (matching your circuit) ━━━━━━━━━━━━━━━
// RFID RC522 (SPI)
#define SS_PIN     5     // SDA pin
#define RST_PIN    27    // Reset pin (changed to 27, since 22 is used by I2C SCL)

// LCD 16x2 (I2C) — uses GPIO 21 (SDA) and GPIO 22 (SCL) by default
#define LCD_ADDRESS 0x27  // Common I2C address (try 0x3F if 0x27 doesn't work)
#define LCD_COLS    16
#define LCD_ROWS    2

// Buzzer (through BC547 transistor)
#define BUZZER_PIN 4

// Red LED (with 330Ω resistor)
#define LED_RED    2

// Push Button
#define BUTTON_PIN 15

// ━━━━━━━━━━━━━━━ TIMING ━━━━━━━━━━━━━━━━━━━━━━
#define SCAN_COOLDOWN_MS    3000   // 3 seconds between same card scans
#define LCD_DISPLAY_TIME_MS 3000   // Show result on LCD for 3 seconds
#define HTTP_TIMEOUT_MS     10000  // 10 second HTTP timeout

// ━━━━━━━━━━━━━━━ GLOBALS ━━━━━━━━━━━━━━━━━━━━━━
MFRC522 rfid(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);

String lastUID = "";
unsigned long lastScanTime = 0;
bool buttonPressed = false;

// Custom LCD characters
byte checkMark[8] = {
  0b00000, 0b00001, 0b00011, 0b10110,
  0b11100, 0b01000, 0b00000, 0b00000
};

byte crossMark[8] = {
  0b00000, 0b10001, 0b01010, 0b00100,
  0b01010, 0b10001, 0b00000, 0b00000
};

byte wifiIcon[8] = {
  0b00000, 0b01110, 0b10001, 0b00100,
  0b01010, 0b00000, 0b00100, 0b00000
};

// ━━━━━━━━━━━━━━━ SETUP ━━━━━━━━━━━━━━━━━━━━━━━━
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("📚 Library RFID Scanner - ESP32");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Initialize pins
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);  // Button with internal pull-up

  digitalWrite(LED_RED, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.createChar(0, checkMark);
  lcd.createChar(1, crossMark);
  lcd.createChar(2, wifiIcon);

  lcd.setCursor(0, 0);
  lcd.print("  Library RFID  ");
  lcd.setCursor(0, 1);
  lcd.print("  System v1.0   ");
  delay(2000);

  // Initialize SPI and RFID reader
  SPI.begin();
  rfid.PCD_Init();
  delay(100);

  // Check RFID reader
  byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("❌ ERROR: MFRC522 not detected! Check wiring.");
    lcdShowError("RFID Reader", "Not Found!");
    blinkError(10);
  } else {
    Serial.print("✅ MFRC522 detected. Firmware: 0x");
    Serial.println(version, HEX);
  }

  // Connect to WiFi
  lcdShowMessage("Connecting to", "WiFi...");
  connectWiFi();

  // Ready!
  lcdShowReady();
  Serial.println("🔍 Ready — place RFID card near the reader...");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  beep(100, 1);
}

// ━━━━━━━━━━━━━━━ MAIN LOOP ━━━━━━━━━━━━━━━━━━━━
void loop() {
  // Check push button (show WiFi status / IP)
  if (digitalRead(BUTTON_PIN) == LOW && !buttonPressed) {
    buttonPressed = true;
    showSystemInfo();
    delay(300);  // Debounce
  }
  if (digitalRead(BUTTON_PIN) == HIGH) {
    buttonPressed = false;
  }

  // Ensure WiFi is connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi disconnected. Reconnecting...");
    lcdShowError("WiFi Lost!", "Reconnecting..");
    connectWiFi();
    lcdShowReady();
  }

  // Check for new RFID card
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }

  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }

  // Read UID
  String uid = getUID();
  Serial.print("🏷️  Card detected: ");
  Serial.println(uid);

  // Cooldown check — prevent rapid duplicate scans
  if (uid == lastUID && (millis() - lastScanTime) < SCAN_COOLDOWN_MS) {
    Serial.println("⏳ Same card scanned too quickly. Waiting...");
    lcdShowMessage("Please wait...", "Card cooldown");
    delay(1000);
    lcdShowReady();
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }

  lastUID = uid;
  lastScanTime = millis();

  // Show scanning status on LCD
  lcdShowMessage("Scanning...", uid);

  // Send to backend
  sendScanToServer(uid);

  // Halt card
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  // Return to ready screen after delay
  delay(LCD_DISPLAY_TIME_MS);
  lcdShowReady();
}

// ━━━━━━━━━━━━━━━ RFID FUNCTIONS ━━━━━━━━━━━━━━━

/**
 * Read RFID card UID as hex string
 */
String getUID() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      uid += "0";
    }
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

// ━━━━━━━━━━━━━━━ HTTP FUNCTIONS ━━━━━━━━━━━━━━━

/**
 * Send RFID UID to backend API via HTTP POST
 */
void sendScanToServer(String uid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected. Cannot send scan.");
    lcdShowError("WiFi Error!", "Not connected");
    indicateError();
    return;
  }

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/rfid/esp32/scan";

  Serial.print("📡 Sending to: ");
  Serial.println(url);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);
  http.setTimeout(HTTP_TIMEOUT_MS);

  // Build JSON payload
  JsonDocument doc;
  doc["rfidUid"] = uid;
  doc["deviceId"] = "ESP32-RFID-01";

  String payload;
  serializeJson(doc, payload);

  Serial.print("📤 Payload: ");
  Serial.println(payload);

  // Send POST request
  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("📥 Response (");
    Serial.print(httpCode);
    Serial.print("): ");
    Serial.println(response);

    // Parse response
    JsonDocument resDoc;
    DeserializationError error = deserializeJson(resDoc, response);

    if (!error && resDoc["success"].as<bool>()) {
      // ✅ Success!
      const char* studentName = resDoc["data"]["student"]["name"];
      const char* entryType = resDoc["data"]["entryType"];
      const char* enrollmentNo = resDoc["data"]["student"]["enrollmentNo"];

      Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      Serial.print("✅ ");
      Serial.print(entryType);
      Serial.print(" — ");
      Serial.println(studentName);
      Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Show on LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.write(0);  // Check mark
      lcd.print(" ");

      // Show ENTRY or EXIT
      String type = String(entryType);
      if (type == "ENTRY") {
        lcd.print("ENTRY Welcome!");
      } else {
        lcd.print("EXIT Goodbye! ");
      }

      lcd.setCursor(0, 1);
      // Show student name (truncate to 16 chars)
      String name = String(studentName);
      if (name.length() > 16) {
        name = name.substring(0, 16);
      }
      lcd.print(name);

      indicateSuccess();
    } else {
      // ❌ API returned an error
      const char* message = resDoc["message"] | "Unknown error";
      Serial.print("⚠️  Server error: ");
      Serial.println(message);

      String msg = String(message);
      if (msg.length() > 16) msg = msg.substring(0, 16);

      lcdShowError("Card Error!", msg);
      indicateError();
    }
  } else {
    Serial.print("❌ HTTP error: ");
    Serial.println(http.errorToString(httpCode));

    lcdShowError("Server Error!", "Check connection");
    indicateError();
  }

  http.end();
}

// ━━━━━━━━━━━━━━━ WiFi FUNCTIONS ━━━━━━━━━━━━━━━

/**
 * Connect to WiFi network
 */
void connectWiFi() {
  Serial.print("📶 Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_RED, !digitalRead(LED_RED));  // Blink red while connecting

    // Show progress on LCD
    lcd.setCursor(attempts % 16, 1);
    lcd.print(".");
    attempts++;
  }

  Serial.println();
  digitalWrite(LED_RED, LOW);

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("✅ WiFi connected! IP: ");
    Serial.println(WiFi.localIP());

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.write(2);  // WiFi icon
    lcd.print(" WiFi Connected");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(2000);
  } else {
    Serial.println("❌ WiFi connection failed!");
    lcdShowError("WiFi Failed!", "Check password");
    blinkError(5);
  }
}

// ━━━━━━━━━━━━━━━ LCD FUNCTIONS ━━━━━━━━━━━━━━━

/**
 * Show ready screen on LCD
 */
void lcdShowReady() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Library System  ");
  lcd.setCursor(0, 1);
  lcd.write(2);  // WiFi icon
  lcd.print(" Scan your card");
}

/**
 * Show a 2-line message on LCD
 */
void lcdShowMessage(const char* line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  if (line2.length() > 16) line2 = line2.substring(0, 16);
  lcd.print(line2);
}

/**
 * Show error on LCD
 */
void lcdShowError(const char* line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.write(1);  // Cross mark
  lcd.print(" ");
  lcd.print(line1);
  lcd.setCursor(0, 1);
  if (line2.length() > 16) line2 = line2.substring(0, 16);
  lcd.print(line2);
}

/**
 * Show system info (on button press)
 */
void showSystemInfo() {
  // Screen 1: WiFi info
  lcd.clear();
  lcd.setCursor(0, 0);
  if (WiFi.status() == WL_CONNECTED) {
    lcd.write(2);
    lcd.print(" ");
    lcd.print(WIFI_SSID);
  } else {
    lcd.write(1);
    lcd.print(" No WiFi");
  }
  lcd.setCursor(0, 1);
  lcd.print("IP:");
  lcd.print(WiFi.localIP());
  delay(3000);

  // Screen 2: Server info
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Server:");
  lcd.setCursor(0, 1);
  String serverStr = String(SERVER_URL);
  if (serverStr.length() > 16) serverStr = serverStr.substring(7, 23);  // Remove http://
  lcd.print(serverStr);
  delay(3000);

  // Back to ready
  lcdShowReady();
}

// ━━━━━━━━━━━━━━━ LED & BUZZER FUNCTIONS ━━━━━━━━━━━━━━━

/**
 * Indicate successful scan (LED blink + single beep)
 */
void indicateSuccess() {
  digitalWrite(LED_RED, HIGH);
  beep(150, 1);
  delay(300);
  digitalWrite(LED_RED, LOW);
}

/**
 * Indicate error (LED blink + triple beep)
 */
void indicateError() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_RED, HIGH);
    beep(100, 1);
    digitalWrite(LED_RED, LOW);
    delay(100);
  }
}

/**
 * Blink red LED for errors
 */
void blinkError(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_RED, HIGH);
    delay(200);
    digitalWrite(LED_RED, LOW);
    delay(200);
  }
}

/**
 * Buzzer beep (through BC547 transistor)
 */
void beep(int durationMs, int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(durationMs);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < times - 1) delay(100);
  }
}
