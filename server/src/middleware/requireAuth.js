const { verifyAccessToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Not authenticated', 401));
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }
}

module.exports = requireAuth;
