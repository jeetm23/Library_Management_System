const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  register,
  login,
  refresh,
  logout,
  registerValidation,
  loginValidation,
} = require('../controllers/auth.controller');

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    message: 'Too many attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

module.exports = router;
