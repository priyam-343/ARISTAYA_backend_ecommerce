const jwt = require("jsonwebtoken");
const dotenv = require('dotenv');
const { ApiError } = require('../utils/apiError');
const { sendErrorResponse } = require('../utils/errorMiddleware');
dotenv.config();

const authUser = (req, res, next) => {
    // Get the auth token from the request header
    const token = req.header('Authorization');

    // If no token is provided, send a 401 response and log the error
    if (!token) {
        console.error("Authentication failed: No token provided.");
        return sendErrorResponse(res, new ApiError(401, "Access denied: No token provided."));
    }

    try {
        // Verify the token using the secret key from the environment variables
        const data = jwt.verify(token, process.env.JWT_SECRET);
        
        let userId;

        // ** CRITICAL FIX: Handle different JWT payload structures gracefully **
        if (data && data.user && data.user.id) {
            // This is the expected and correct structure
            userId = data.user.id;
        } else if (data && data.id) {
            // This handles older or different tokens that may have had a simple { id: '...' } payload
            userId = data.id;
        }

        // If no user ID could be extracted, log an error and deny access
        if (!userId) {
            console.error("Authentication failed: JWT payload is missing user data.");
            return sendErrorResponse(res, new ApiError(401, "Authentication failed: Invalid token payload."));
        }

        // Normalize the user object on the request to ensure it always has a consistent structure
        req.user = { id: userId };
        
        // Move to the next middleware or route handler
        next();
    } catch (error) {
        // Log the specific error for debugging purposes
        console.error("Authentication failed:", error.message);

        // Handle specific JWT errors and send appropriate responses
        if (error.name === 'TokenExpiredError') {
            return sendErrorResponse(res, new ApiError(401, "Access denied: Token expired."));
        }
        if (error.name === 'JsonWebTokenError') {
            return sendErrorResponse(res, new ApiError(401, "Access denied: Invalid token."));
        }

        // For any other unexpected error, send a generic access denied message
        return sendErrorResponse(res, new ApiError(401, "Access denied."));
    }
};

module.exports = authUser;
