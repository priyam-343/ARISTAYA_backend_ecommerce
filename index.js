require('dotenv').config();
const connectToMongo = require('./config');
const express = require('express');
const cors = require('cors');
const path = require('path');


// --- Route Imports ---
const auth = require('./routes/auth');
const cart = require('./routes/cart');
const wishlist = require('./routes/wishlist');
const product = require('./routes/product');
const review = require('./routes/review');
const paymentRoute = require('./routes/paymentRoute'); // This will now handle the webhook
const forgotPassword = require('./routes/forgotPassword');
const AdminRoute = require('./routes/Admin/AdminAuth');


// --- Utility Imports ---
const { ApiError } = require('./utils/apiError');
const { sendErrorResponse } = require('./utils/errorMiddleware');


// Connect to MongoDB
connectToMongo();

const port = process.env.PORT || 2000;

const app = express();

// --- IMPORTANT: Raw Body Parser ONLY for the dedicated Razorpay webhook route ---
// This middleware ensures the raw request body is available for webhook signature verification.
// It MUST come BEFORE other general body parsers (express.json(), express.urlencoded())
// for its specific path. Razorpay sends the raw body, not JSON, for signature calculation.
app.use('/api/payment/webhook', express.raw({ type: 'application/json' })); 

// --- General Body Parsers ---
// These will parse JSON and URL-encoded bodies for ALL OTHER routes.
// They will NOT apply to '/api/payment/webhook' because express.raw already processed it
// and terminated the middleware chain for that specific path.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// --- CORS Configuration ---
const allowedOrigins = [
  'https://aristaya.vercel.app', 
  'http://localhost:3000',      
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // Allow cookies to be sent
}));


// Serve static files from the 'build' directory (for your frontend)
app.use(express.static(path.join(__dirname, 'build')));


// --- Route Definitions ---
// The paymentRoute now specifically handles the Razorpay webhook at '/api/payment/webhook'.
// Other payment-related routes (like checkout, getkey, getpaymentdetails) are also handled by it.
app.use('/api/auth', auth);
app.use('/api/product', product);
app.use('/api/cart', cart);
app.use('/api/wishlist', wishlist);
app.use('/api/review', review);
app.use('/api/admin', AdminRoute);
app.use('/api/payment', paymentRoute); 
app.use('/api/password', forgotPassword);


// --- Centralized Error Handling Middleware ---
// This catches any errors thrown in your routes or other middleware.
app.use((err, req, res, next) => {
    sendErrorResponse(res, err, "An unexpected server error occurred.");
});


// --- Server Start ---
app.listen(port, () => {
    console.log(`E-commerce backend listening at http://localhost:${port}`);
});