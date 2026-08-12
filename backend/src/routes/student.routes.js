const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  getAllStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentIssues,
  getStudentFines,
  studentValidation,
} = require('../controllers/student.controller');

router.use(authenticate);

router.get('/', getAllStudents);
router.post('/', studentValidation, createStudent);
router.get('/:id', getStudentById);
router.put('/:id', studentValidation, updateStudent);
router.delete('/:id', deleteStudent);
router.get('/:id/issues', getStudentIssues);
router.get('/:id/fines', getStudentFines);

module.exports = router;
