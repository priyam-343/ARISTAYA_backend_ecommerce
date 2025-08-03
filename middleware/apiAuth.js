const dotenv = require('dotenv').config();
const { ApiError } = require('../utils/apiError'); 
const { sendErrorResponse } = require('../utils/errorMiddleware'); 

function checkOrigin(req, res, next) {
    const allowedOrigins = [process.env.FRONTEND_URL_1, process.env.FRONTEND_URL_2];
    const origin = req.headers.origin;

    
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); 
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true'); 
    }

    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204); 
    }

    
    if (origin && !allowedOrigins.includes(origin)) {
        
        return sendErrorResponse(res, new ApiError(403, 'Forbidden: Origin not allowed.'));
    }

    next(); 
}

module.exports = checkOrigin;
