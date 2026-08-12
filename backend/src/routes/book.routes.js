const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
  getAllBooks,
  createBook,
  getBookById,
  updateBook,
  deleteBook,
  searchBooks,
  bookValidation,
} = require('../controllers/book.controller');

router.use(authenticate);

router.get('/search', searchBooks);
router.get('/', getAllBooks);
router.post('/', bookValidation, createBook);
router.get('/:id', getBookById);
router.put('/:id', updateBook);
router.delete('/:id', authorize('ADMIN'), deleteBook);

module.exports = router;
