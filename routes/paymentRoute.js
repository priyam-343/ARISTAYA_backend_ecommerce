const express = require('express');
const { checkout, paymentVerification, getPaymentDetails } = require('../controller/paymentController'); 
const router = express.Router();
const Payment = require('../models/Payment'); 
const Product = require('../models/Product'); 
const User = require('../models/User');     
const authUser = require('../middleware/authUser'); 
const dotenv = require('dotenv');
const { ApiError } = require('../utils/apiError'); 
const { sendErrorResponse } = require('../utils/errorMiddleware'); 

dotenv.config();

// Important: You will need this line of middleware in your main `app.js` file
// before you use this router, or on this specific router instance, to get the raw body.
// Example:
// app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

router.route('/checkout').post(checkout);

// This is the dedicated endpoint for server-to-server Razorpay webhooks.
// We are now exclusively using this to handle payment status updates.
// The old client-side callback route has been removed.
router.route('/webhook').post(paymentVerification); 

// Endpoint to get the Razorpay API key for the front-end
router.route('/getkey').get((req, res) => res.status(200).json({ success: true, key: process.env.RAZORPAY_API_KEY }));

// Endpoint for the front-end to fetch a specific payment's details
router.get('/getpaymentdetails/:paymentId', getPaymentDetails);

// Endpoint to fetch a user's previous orders
router.get('/getPreviousOrders', authUser, async (req, res) => {
  try {
    const orders = await Payment.find({ user: req.user.id }) 
      .populate({
        path: 'productData.productId', 
        model: 'product',             
        select: 'name images price mainCategory subCategory' 
      })
      .populate('user', 'firstName lastName email address city userState zipCode')
      .sort({ createdAt: -1 }); 

    res.status(200).json({ success: true, orders: orders, message: "Previous orders fetched successfully." });
  } catch (error) {
    console.error("Error fetching previous orders:", error); 
    sendErrorResponse(res, error, "Something went wrong while fetching previous orders.");
  }
});

module.exports = router;