require('dotenv').config();
const connectToMongo = require('./config');
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const auth = require('./routes/auth');
const cart = require('./routes/cart');
const wishlist = require('./routes/wishlist');
const product = require('./routes/product');
const review = require('./routes/review');
const paymentRoute = require('./routes/paymentRoute');
const forgotPassword = require('./routes/forgotPassword');
const AdminRoute = require('./routes/Admin/AdminAuth');

// Import custom middleware
const checkOrigin = require('./middleware/apiAuth');

// Import custom error handling utility
// NOTE: You will need to create these files in a 'utils' folder.
const { ApiError } = require('./utils/apiError');
const { sendErrorResponse } = require('./utils/errorMiddleware');

// Connect to MongoDB
connectToMongo();

const port = process.env.PORT || 2000;

const app = express();

// --- Core Middleware ---
// Built-in Express middleware for parsing JSON and URL-encoded data
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads

// CORS middleware - configure for production
app.use(cors());

// Serve static files from the 'build' directory (for frontend)
// This assumes your frontend build output is placed in a 'build' folder
// at the root of your backend project.
app.use(express.static(path.join(__dirname, 'build')));

// Custom origin check middleware
app.use(checkOrigin);

// --- API Routes ---
app.use('/api/auth', auth);
app.use('/api/product', product);
app.use('/api/cart', cart);
app.use('/api/wishlist', wishlist);
app.use('/api/review', review);
app.use('/api/admin', AdminRoute);
app.use('/api/payment', paymentRoute);
app.use('/api/password', forgotPassword);

// --- Global Error Handling Middleware ---
// This middleware should be placed after all routes and other middleware.
// It catches any errors thrown by route handlers or other middleware.
app.use((err, req, res, next) => {
    // Use the standardized error response utility
    // The default message is for unhandled errors that are not ApiError instances
    sendErrorResponse(res, err, "An unexpected server error occurred.");
});

// Start the server
app.listen(port, () => {
    console.log(`E-commerce backend listening at http://localhost:${port}`);
});
