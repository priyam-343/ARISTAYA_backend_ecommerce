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


router.route('/checkout').post(checkout);


router.route('/paymentverification').post(paymentVerification);


router.route('/getkey').get((req, res) => res.status(200).json({ success: true, key: process.env.RAZORPAY_API_KEY }));


router.get('/getpaymentdetails/:paymentId', getPaymentDetails);


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
