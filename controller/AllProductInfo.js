// Path: your-backend/controller/AllProductInfo.js

const User = require("../models/User"); // Ensure User model is imported
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const Review = require("../models/Review");
const Payment = require("../models/Payment"); // Ensure Payment model is imported
const Product = require("../models/Product"); // Ensure Product model is imported

const { ApiError } = require('../utils/apiError');
const { sendErrorResponse } = require('../utils/errorMiddleware');

const chartData = async (req, res) => {
    try {
        const cart = await Cart.find().populate("productId", "name price mainCategory images");
        const wishlist = await Wishlist.find().populate("productId", "name price mainCategory images");

        // *** FIX: Populate productData.productId for Payment documents ***
        const payment = await Payment.find()
            // No need to populate 'userData' as it's an embedded subdocument in PaymentSchema
            .populate({
                path: 'productData.productId', // Path to the productId inside the productData array
                select: 'name price mainCategory images' // Select desired product fields for display
            });

        const product = await Product.find();
        const review = await Review.find();

        res.status(200).json({
            success: true,
            data: {
                reviews: review,
                products: product,
                payments: payment, // This now contains correctly populated product data for OrderTable
                wishlistItems: wishlist,
                cartItems: cart
            },
            message: "Chart data fetched successfully."
        });
    } catch (error) {
        sendErrorResponse(res, error, "Error fetching chart data.");
    }
};

module.exports = { chartData };