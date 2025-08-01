// utils/apiError.js
class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // Indicates an expected, handled error
        // Capture stack trace for better debugging, excluding this constructor
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = { ApiError };
