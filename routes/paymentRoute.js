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

// Route for initiating checkout
router.route('/checkout').post(checkout);

// Route for payment verification (Razorpay callback)
router.route('/paymentverification').post(paymentVerification);

// Route to get Razorpay API key (for frontend)
router.route('/getkey').get((req, res) => res.status(200).json({ success: true, key: process.env.RAZORPAY_API_KEY }));

// Route to get details of a specific payment by ID
router.get('/getpaymentdetails/:paymentId', getPaymentDetails);

// Route to get all previous orders for the authenticated user
router.get('/getPreviousOrders', authUser, async (req, res) => {
  try {
    // CRITICAL FIX: Change `userId` to `user` to match the PaymentSchema field name
    const orders = await Payment.find({ user: req.user.id }) // Find orders for the authenticated user using the 'user' field
      .populate({
        path: 'productData.productId', // Path to the productId field within productData array
        model: 'product',             // Use 'product' to match your schema definition
        select: 'name images price mainCategory subCategory' // Select only necessary fields
      })
      // CRITICAL FIX: Populate the `user` field, not `userId`, to get user details for the shipping address
      .populate('user', 'firstName lastName email address city userState zipCode')
      .sort({ createdAt: -1 }); // Sort by newest orders first

    res.status(200).json({ success: true, orders: orders, message: "Previous orders fetched successfully." });
  } catch (error) {
    console.error("Error fetching previous orders:", error); // Log the detailed error
    sendErrorResponse(res, error, "Something went wrong while fetching previous orders.");
  }
});

module.exports = router;
