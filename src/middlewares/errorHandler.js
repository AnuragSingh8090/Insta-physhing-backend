/**
 * Central error-handling middleware.
 * Attach to app with app.use(errorHandler) after all routes.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
