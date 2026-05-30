const AppError = require('../utils/AppError');

function requireShopper(req, res, next) {
  if (!req.user || req.user.role !== 'SHOPPER') {
    return next(new AppError('Forbidden: Shopper role required', 403));
  }
  next();
}

module.exports = requireShopper;
