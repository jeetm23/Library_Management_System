const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  scanRFID,
  getAllLogs,
  getTodayLogs,
  getStudentLogs,
  scanValidation,
} = require('../controllers/rfid.controller');

router.use(authenticate);

router.post('/scan', scanValidation, scanRFID);
router.get('/logs', getAllLogs);
router.get('/logs/today', getTodayLogs);
router.get('/logs/student/:id', getStudentLogs);

module.exports = router;
