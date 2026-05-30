const pino = require('pino');
const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!err.isOperational) {
    logger.error({ err, req: { method: req.method, url: req.url } }, 'Unhandled error');
  }

  res.status(statusCode).json({
    success: false,
    message: err.isOperational ? err.message : 'Something went wrong',
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = errorHandler;
