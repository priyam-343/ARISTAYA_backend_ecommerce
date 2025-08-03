

const User = require("../models/User"); 
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const Review = require("../models/Review");
const Payment = require("../models/Payment"); 
const Product = require("../models/Product"); 

const { ApiError } = require('../utils/apiError');
const { sendErrorResponse } = require('../utils/errorMiddleware');

const chartData = async (req, res) => {
    try {
        const cart = await Cart.find().populate("productId", "name price mainCategory images");
        const wishlist = await Wishlist.find().populate("productId", "name price mainCategory images");

        
        const payment = await Payment.find()
            
            .populate({
                path: 'productData.productId', 
                select: 'name price mainCategory images' 
            });

        const product = await Product.find();
        const review = await Review.find();

        res.status(200).json({
            success: true,
            data: {
                reviews: review,
                products: product,
                payments: payment, 
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