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

// We are no longer using the custom checkOrigin middleware.
// const checkOrigin = require('./middleware/apiAuth'); // <-- This is commented out.

// Import custom error handling utility
const { ApiError } = require('./utils/apiError');
const { sendErrorResponse } = require('./utils/errorMiddleware');

// Connect to MongoDB
connectToMongo();

const port = process.env.PORT || 2000;

const app = express();

// --- Core Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//
// --------------------------------------------------------------------
// ** Corrected and Explicit CORS middleware. **
// This handles all CORS-related headers and pre-flight requests.
// --------------------------------------------------------------------
//
const allowedOrigins = [
  'https://aristaya.vercel.app', // Your Vercel frontend URL
  'http://localhost:3000',      // Your local frontend URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // This is crucial for handling cookies and sessions
}));

// Serve static files from the 'build' directory
app.use(express.static(path.join(__dirname, 'build')));

// ** The conflicting custom middleware has been removed from here. **
// app.use(checkOrigin);

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
app.use((err, req, res, next) => {
    sendErrorResponse(res, err, "An unexpected server error occurred.");
});

// Start the server
app.listen(port, () => {
    console.log(`E-commerce backend listening at http://localhost:${port}`);
});
