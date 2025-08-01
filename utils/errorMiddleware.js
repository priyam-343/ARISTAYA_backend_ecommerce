// utils/errorMiddleware.js
const { ApiError } = require('./apiError');

// Centralized error response utility
const sendErrorResponse = (res, error, defaultMessage = "Internal server error") => {
    // If it's an operational error (e.g., 400, 404, 401)
    if (error instanceof ApiError && error.isOperational) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    // For Mongoose CastErrors (invalid ObjectId format)
    if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: "Invalid ID format." });
    }
    // For Mongoose ValidationErrors (schema validation failures)
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, message: `Validation Error: ${messages.join(', ')}` });
    }

    // For any other unexpected errors, log them and send a generic 500 response
    console.error(`Unhandled Server Error: ${error.message}`, error.stack);
    res.status(500).json({ success: false, message: defaultMessage });
};

module.exports = { sendErrorResponse };
