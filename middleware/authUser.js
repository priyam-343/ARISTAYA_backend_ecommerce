const jwt = require("jsonwebtoken");
const dotenv = require('dotenv');
const { ApiError } = require('../utils/apiError'); // Import ApiError
const { sendErrorResponse } = require('../utils/errorMiddleware'); // Import sendErrorResponse
dotenv.config();

const authUser = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return sendErrorResponse(res, new ApiError(401, "Access denied: No token provided."));
    }

    try {
        const data = jwt.verify(token, process.env.JWT_SECRET);
        req.user = data.user; // Assuming JWT payload has a 'user' object with 'id'
        next();
    } catch (error) {
        // Handle specific JWT errors if needed, otherwise send generic access denied
        if (error.name === 'TokenExpiredError') {
            return sendErrorResponse(res, new ApiError(401, "Access denied: Token expired."));
        }
        if (error.name === 'JsonWebTokenError') {
            return sendErrorResponse(res, new ApiError(401, "Access denied: Invalid token."));
        }
        sendErrorResponse(res, new ApiError(401, "Access denied."));
    }
};

module.exports = authUser;
