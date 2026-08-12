const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const {
  issueBook,
  getAllIssues,
  getIssueById,
  returnBook,
  getOverdueIssues,
  issueValidation,
} = require('../controllers/issue.controller');

router.use(authenticate);

router.get('/overdue', getOverdueIssues);
router.get('/', getAllIssues);
router.post('/', issueValidation, issueBook);
router.get('/:id', getIssueById);
router.put('/:id/return', returnBook);

module.exports = router;
