const prisma = require('../prisma');
const { sendResponse, getPagination, paginatedResponse } = require('../utils/helpers');
const { body, validationResult } = require('express-validator');

/**
 * Validation rules
 */
const bookValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('author').trim().notEmpty().withMessage('Author is required'),
  body('isbn').trim().notEmpty().withMessage('ISBN is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('publisher').optional().trim(),
  body('totalCopies').optional().isInt({ min: 1 }).withMessage('Total copies must be at least 1'),
  body('shelfLocation').optional().trim(),
];

/**
 * GET /api/books — List all books (filter by category, availability)
 */
const getAllBooks = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { category, available, search } = req.query;

    const where = {};

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (available === 'true') {
      where.availableCopies = { gt: 0 };
    } else if (available === 'false') {
      where.availableCopies = { equals: 0 };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { issues: true } },
        },
      }),
      prisma.book.count({ where }),
    ]);

    return sendResponse(
      res, 200, true, 'Books fetched successfully.',
      paginatedResponse(books, total, page, limit)
    );
  } catch (error) {
    console.error('Get books error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch books.');
  }
};

/**
 * POST /api/books — Add new book
 */
const createBook = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, 'Validation failed', errors.array());
    }

    const { title, author, isbn, category, publisher, totalCopies, shelfLocation } = req.body;

    // Check for duplicate ISBN
    const existing = await prisma.book.findUnique({ where: { isbn } });
    if (existing) {
      return sendResponse(res, 409, false, 'Book with this ISBN already exists.');
    }

    const copies = totalCopies || 1;
    const book = await prisma.book.create({
      data: {
        title,
        author,
        isbn,
        category,
        publisher,
        totalCopies: copies,
        availableCopies: copies,
        shelfLocation,
      },
    });

    return sendResponse(res, 201, true, 'Book added successfully.', book);
  } catch (error) {
    console.error('Create book error:', error);
    return sendResponse(res, 500, false, 'Failed to add book.');
  }
};

/**
 * GET /api/books/:id — Get book details
 */
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    const book = await prisma.book.findUnique({
      where: { id: parseInt(id) },
      include: {
        issues: {
          include: { student: { select: { id: true, name: true, enrollmentNo: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { issues: true } },
      },
    });

    if (!book) {
      return sendResponse(res, 404, false, 'Book not found.');
    }

    return sendResponse(res, 200, true, 'Book details fetched.', book);
  } catch (error) {
    console.error('Get book error:', error);
    return sendResponse(res, 500, false, 'Failed to fetch book details.');
  }
};

/**
 * PUT /api/books/:id — Update book
 */
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, isbn, category, publisher, totalCopies, shelfLocation } = req.body;

    const existing = await prisma.book.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return sendResponse(res, 404, false, 'Book not found.');
    }

    // If total copies is being updated, adjust available copies
    let newAvailable = existing.availableCopies;
    if (totalCopies !== undefined) {
      const issuedCopies = existing.totalCopies - existing.availableCopies;
      newAvailable = Math.max(0, totalCopies - issuedCopies);
    }

    const book = await prisma.book.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(author && { author }),
        ...(isbn && { isbn }),
        ...(category && { category }),
        ...(publisher !== undefined && { publisher }),
        ...(totalCopies !== undefined && { totalCopies, availableCopies: newAvailable }),
        ...(shelfLocation !== undefined && { shelfLocation }),
      },
    });

    return sendResponse(res, 200, true, 'Book updated successfully.', book);
  } catch (error) {
    console.error('Update book error:', error);
    return sendResponse(res, 500, false, 'Failed to update book.');
  }
};

/**
 * DELETE /api/books/:id — Remove book
 */
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    const book = await prisma.book.findUnique({ where: { id: parseInt(id) } });
    if (!book) {
      return sendResponse(res, 404, false, 'Book not found.');
    }

    // Check for active issues
    const activeIssues = await prisma.bookIssue.count({
      where: { bookId: parseInt(id), status: { in: ['ISSUED', 'OVERDUE'] } },
    });

    if (activeIssues > 0) {
      return sendResponse(res, 400, false, `Cannot delete: book has ${activeIssues} active issue(s).`);
    }

    await prisma.book.delete({ where: { id: parseInt(id) } });

    return sendResponse(res, 200, true, 'Book deleted successfully.');
  } catch (error) {
    console.error('Delete book error:', error);
    return sendResponse(res, 500, false, 'Failed to delete book.');
  }
};

/**
 * GET /api/books/search?q= — Search by title/author/ISBN
 */
const searchBooks = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return sendResponse(res, 400, false, 'Search query is required.');
    }

    const books = await prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { author: { contains: q, mode: 'insensitive' } },
          { isbn: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { title: 'asc' },
    });

    return sendResponse(res, 200, true, `Found ${books.length} books.`, books);
  } catch (error) {
    console.error('Search books error:', error);
    return sendResponse(res, 500, false, 'Search failed.');
  }
};

module.exports = {
  getAllBooks,
  createBook,
  getBookById,
  updateBook,
  deleteBook,
  searchBooks,
  bookValidation,
};
