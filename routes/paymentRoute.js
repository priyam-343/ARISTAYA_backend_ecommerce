const express = require('express');
const { checkout, paymentVerification, getPaymentDetails } = require('../controller/paymentController'); // ADDED getPaymentDetails here
const router = express.Router()
const Payment = require('../models/Payment')
const User = require('../models/User')
const authUser = require('../middleware/authUser')
const dotenv = require('dotenv');
dotenv.config()

router.route('/checkout').post(checkout)
router.route('/paymentverification').post(paymentVerification)
router.route('/getkey').get((req, res) => res.status(200).json({ key: process.env.RAZORPAY_API_KEY }))

// NEW ROUTE: To fetch payment details by paymentId
router.get('/getpaymentdetails/:paymentId', getPaymentDetails); // ADDED this route

router.get('/getPreviousOrders', authUser, async (req, res) => {
  try {
    const data = await Payment.find({ user: req.user.id }).sort({ createdAt: -1 })
    res.send(data)
  }
  catch (error) {
    res.status(500).send("Something went wrong")
  }
})

module.exports = router
