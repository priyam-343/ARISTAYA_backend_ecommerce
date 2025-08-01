const dotenv = require('dotenv').config();
const { ApiError } = require('../utils/apiError'); // Import ApiError
const { sendErrorResponse } = require('../utils/errorMiddleware'); // Import sendErrorResponse

function checkOrigin(req, res, next) {
    const allowedOrigins = [process.env.FRONTEND_URL_1, process.env.FRONTEND_URL_2];
    const origin = req.headers.origin;

    // Set CORS headers for all requests if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Include OPTIONS
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true'); // If you use cookies/credentials
    }

    // Handle preflight requests (OPTIONS method)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204); // Respond with 204 No Content for preflight
    }

    // If origin is not allowed, send 403 Forbidden
    if (origin && !allowedOrigins.includes(origin)) {
        // Use the standardized error response
        return sendErrorResponse(res, new ApiError(403, 'Forbidden: Origin not allowed.'));
    }

    next(); // Continue to the next middleware/route handler
}

module.exports = checkOrigin;
