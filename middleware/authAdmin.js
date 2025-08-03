const jwt = require("jsonwebtoken");
const dotenv = require('dotenv');
const User = require('../models/User.js');
const { ApiError } = require('../utils/apiError'); 
const { sendErrorResponse } = require('../utils/errorMiddleware'); 
dotenv.config();

const authAdmin = async (req, res, next) => { 
    const token = req.header('Authorization');

    if (!token) {
        return sendErrorResponse(res, new ApiError(401, "Access denied: No token provided."));
    }

    try {
        const data = jwt.verify(token, process.env.JWT_SECRET);
        req.user = data.user; 

        
        const user = await User.findById(req.user.id);

        if (!user) {
            return sendErrorResponse(res, new ApiError(404, "User not found."));
        }

        if (user.isAdmin === true) {
            next(); 
        } else {
            return sendErrorResponse(res, new ApiError(403, "Access denied: Not an administrator."));
        }
    } catch (error) {
        
        if (error.name === 'TokenExpiredError') {
            return sendErrorResponse(res, new ApiError(401, "Access denied: Token expired."));
        }
        if (error.name === 'JsonWebTokenError') {
            return sendErrorResponse(res, new ApiError(401, "Access denied: Invalid token."));
        }
        sendErrorResponse(res, new ApiError(401, "Access denied."));
    }
};

module.exports = authAdmin; 
