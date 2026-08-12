const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { sendResponse } = require('../utils/helpers');
const { body, validationResult } = require('express-validator');

/**
 * Validation rules
 */
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['ADMIN', 'LIBRARIAN']).withMessage('Role must be ADMIN or LIBRARIAN'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Generate access and refresh tokens
 */
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, 'Validation failed', errors.array());
    }

    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return sendResponse(res, 409, false, 'User with this email already exists.');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'LIBRARIAN',
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const tokens = generateTokens(user);

    return sendResponse(res, 201, true, 'User registered successfully.', {
      user,
      ...tokens,
    });
  } catch (error) {
    console.error('Register error:', error);
    return sendResponse(res, 500, false, 'Registration failed.', error.message);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, false, 'Validation failed', errors.array());
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return sendResponse(res, 401, false, 'Invalid email or password.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return sendResponse(res, 401, false, 'Invalid email or password.');
    }

    const tokens = generateTokens(user);

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return sendResponse(res, 200, true, 'Login successful.', {
      user: userData,
      ...tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    return sendResponse(res, 500, false, 'Login failed.', error.message);
  }
};

/**
 * POST /api/auth/refresh
 */
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendResponse(res, 400, false, 'Refresh token is required.');
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      return sendResponse(res, 401, false, 'User not found.');
    }

    const tokens = generateTokens(user);

    return sendResponse(res, 200, true, 'Token refreshed.', tokens);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendResponse(res, 401, false, 'Refresh token expired. Please login again.');
    }
    return sendResponse(res, 401, false, 'Invalid refresh token.');
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  // For JWT, logout is handled client-side by removing tokens
  // Server can optionally blacklist the token
  return sendResponse(res, 200, true, 'Logged out successfully.');
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  registerValidation,
  loginValidation,
};
