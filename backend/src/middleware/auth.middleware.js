const jwt = require('jsonwebtoken');
const { sendResponse } = require('../utils/helpers');

/**
 * JWT Authentication Middleware
 * Verifies the access token from Authorization header
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendResponse(res, 401, false, 'Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendResponse(res, 401, false, 'Token expired. Please refresh your token.');
    }
    if (error.name === 'JsonWebTokenError') {
      return sendResponse(res, 401, false, 'Invalid token.');
    }
    return sendResponse(res, 500, false, 'Authentication error.');
  }
};

module.exports = { authenticate };
