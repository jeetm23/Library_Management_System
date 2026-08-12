const { sendResponse } = require('../utils/helpers');

/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles (e.g., 'ADMIN', 'LIBRARIAN')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(res, 401, false, 'Authentication required.');
    }

    if (!roles.includes(req.user.role)) {
      return sendResponse(
        res,
        403,
        false,
        `Access denied. Required role: ${roles.join(' or ')}.`
      );
    }

    next();
  };
};

module.exports = { authorize };
