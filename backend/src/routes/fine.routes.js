const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  getAllFines,
  getFineById,
  payFine,
  getStudentFines,
} = require('../controllers/fine.controller');

router.use(authenticate);

router.get('/', authorize('ADMIN'), getAllFines);
router.get('/student/:id', getStudentFines);
router.get('/:id', getFineById);
router.put('/:id/pay', payFine);

module.exports = router;
