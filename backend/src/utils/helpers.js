/**
 * Standardized API response format
 */
const sendResponse = (res, statusCode, success, message, data = null) => {
  const response = { success, message };
  if (data !== null) response.data = data;
  return res.status(statusCode).json(response);
};

/**
 * Calculate the difference in days between two dates
 */
const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.round((d2 - d1) / oneDay);
};

/**
 * Get a date N days from now
 */
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Get start and end of today (UTC)
 */
const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start, end };
};

/**
 * Build pagination parameters from query
 */
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Format pagination response
 */
const paginatedResponse = (data, total, page, limit) => {
  return {
    items: data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

module.exports = {
  sendResponse,
  daysBetween,
  addDays,
  getTodayRange,
  getPagination,
  paginatedResponse,
};
