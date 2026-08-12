/**
 * Fine Calculation Service
 * Calculates overdue fines based on configurable rates and grace periods
 */

const calculateFine = (dueDate, returnDate = new Date()) => {
  const finePerDay = parseFloat(process.env.FINE_PER_DAY) || 2;
  const gracePeriod = parseInt(process.env.GRACE_PERIOD_DAYS) || 0;

  const due = new Date(dueDate);
  const returned = new Date(returnDate);

  // Set both dates to start of day for accurate day calculation
  due.setHours(0, 0, 0, 0);
  returned.setHours(0, 0, 0, 0);

  const diffTime = returned.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const daysOverdue = Math.max(0, diffDays - gracePeriod);
  const fineAmount = daysOverdue * finePerDay;

  return {
    daysOverdue,
    fineAmount,
    finePerDay,
    gracePeriod,
    isOverdue: daysOverdue > 0,
  };
};

module.exports = { calculateFine };
