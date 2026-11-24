const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  scanRFID,
  getAllLogs,
  getTodayLogs,
  getStudentLogs,
  scanValidation,
  scanFromESP32,
  esp32ScanValidation,
  registerCard,
  assignCardDirect,
} = require('../controllers/rfid.controller');

// ━━━━━━━━━━━━━━━ ESP32 HARDWARE ROUTES (API key auth, NO JWT) ━━━━━━━━━━━━━━━
// These endpoints are called directly by the ESP32 device
router.post('/esp32/scan', esp32ScanValidation, scanFromESP32);
router.post('/esp32/register-card', registerCard);
router.put('/esp32/assign-direct', assignCardDirect);

// ━━━━━━━━━━━━━━━ WEB APP ROUTES (JWT auth required) ━━━━━━━━━━━━━━━━━━━━━━
router.use(authenticate);

router.post('/scan', scanValidation, scanRFID);
router.get('/logs', getAllLogs);
router.get('/logs/today', getTodayLogs);
router.get('/logs/student/:id', getStudentLogs);

module.exports = router;
