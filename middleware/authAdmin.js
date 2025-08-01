const jwt = require("jsonwebtoken");
const dotenv = require('dotenv');
const User = require('../models/User.js');
const { ApiError } = require('../utils/apiError'); // Import ApiError
const { sendErrorResponse } = require('../utils/errorMiddleware'); // Import sendErrorResponse
dotenv.config();

const authAdmin = async (req, res, next) => { // Renamed function to authAdmin
    const token = req.header('Authorization');

    if (!token) {
        return sendErrorResponse(res, new ApiError(401, "Access denied: No token provided."));
    }

    try {
        const data = jwt.verify(token, process.env.JWT_SECRET);
        req.user = data.user; // Assuming JWT payload has a 'user' object with 'id'

        // Fetch user from DB to ensure isAdmin status is current and not just from token
        const user = await User.findById(req.user.id);

        if (!user) {
            return sendErrorResponse(res, new ApiError(404, "User not found."));
        }

        if (user.isAdmin === true) {
            next(); // User is an admin, proceed
        } else {
            return sendErrorResponse(res, new ApiError(403, "Access denied: Not an administrator."));
        }
    } catch (error) {
        // Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
            return sendErrorResponse(res, new ApiError(401, "Access denied: Token expired."));
        }
        if (error.name === 'JsonWebTokenError') {
            return sendErrorResponse(res, new ApiError(401, "Access denied: Invalid token."));
        }
        sendErrorResponse(res, new ApiError(401, "Access denied."));
    }
};

module.exports = authAdmin; // Updated module.exports to authAdmin
