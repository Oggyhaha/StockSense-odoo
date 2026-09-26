function errorHandler(err, req, res, next) {
    console.error('Unhandled Application Error:', err);

    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({
        success: false,
        error: err.name || 'InternalServerError',
        message: err.message || 'An unexpected server error occurred',
        timestamp: new Date().toISOString()
    });
}

module.exports = errorHandler;
