const jwt = require("jsonwebtoken");
const dotenv = require('dotenv');
const { ApiError } = require('../utils/apiError');
const { sendErrorResponse } = require('../utils/errorMiddleware');
dotenv.config();

const authUser = (req, res, next) => {
    
    const token = req.header('Authorization');

    
    if (!token) {
        console.error("Authentication failed: No token provided.");
        return sendErrorResponse(res, new ApiError(401, "Access denied: No token provided."));
    }

    try {
        
        const data = jwt.verify(token, process.env.JWT_SECRET);
        
        let userId;

        
        if (data && data.user && data.user.id) {
            
            userId = data.user.id;
        } else if (data && data.id) {
            
            userId = data.id;
        }

        
        if (!userId) {
            console.error("Authentication failed: JWT payload is missing user data.");
            return sendErrorResponse(res, new ApiError(401, "Authentication failed: Invalid token payload."));
        }

        
        req.user = { id: userId };
        
        
        next();
    } catch (error) {
        
        console.error("Authentication failed:", error.message);

        
        if (error.name === 'TokenExpiredError') {
            return sendErrorResponse(res, new ApiError(401, "Access denied: Token expired."));
        }
        if (error.name === 'JsonWebTokenError') {
            return sendErrorResponse(res, new ApiError(401, "Access denied: Invalid token."));
        }

        
        return sendErrorResponse(res, new ApiError(401, "Access denied."));
    }
};

module.exports = authUser;
