
const { ApiError } = require('./apiError');


const sendErrorResponse = (res, error, defaultMessage = "Internal server error") => {
    
    if (error instanceof ApiError && error.isOperational) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    
    if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: "Invalid ID format." });
    }
    
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, message: `Validation Error: ${messages.join(', ')}` });
    }

    
    console.error(`Unhandled Server Error: ${error.message}`, error.stack);
    res.status(500).json({ success: false, message: defaultMessage });
};

module.exports = { sendErrorResponse };
