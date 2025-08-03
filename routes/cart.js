const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const authUser = require("../middleware/authUser");
const { ApiError } = require('../utils/apiError');
const { sendErrorResponse } = require('../utils/errorMiddleware');
const mongoose = require('mongoose'); 

router.get("/fetchcart", authUser, async (req, res) => {
    try {
        const cart = await Cart.find({ user: req.user.id })
            .populate("productId", "name price images rating numOfReviews type")
            .populate("user", "firstName lastName email");
        res.status(200).json({ success: true, cart });
    } catch (error) {
        sendErrorResponse(res, error, "Internal server error while fetching cart.");
    }
});

router.post("/addcart", authUser, async (req, res) => {
    try {
        const { _id, quantity } = req.body;

        if (!mongoose.Types.ObjectId.isValid(_id)) {
            throw new ApiError(400, "Invalid product ID format.");
        }
        if (typeof quantity !== 'number' || quantity < 1) {
            throw new ApiError(400, "Quantity must be a positive number.");
        }

        const findProduct = await Cart.findOne({ $and: [{ productId: _id }, { user: req.user.id }] });
        if (findProduct) {
            throw new ApiError(400, "Product already in cart.");
        } else {
            const cart = new Cart({
                user: req.user.id,
                productId: _id,
                quantity,
            });
            const savedCart = await cart.save();
            res.status(201).json({ success: true, savedCart, message: "Product added to cart successfully." });
        }
    } catch (error) {
        sendErrorResponse(res, error, "Internal server error while adding to cart.");
    }
});

router.delete("/deletecart/:id", authUser, async (req, res) => {
    const cartItemId = req.params.id;
    try {
        if (!mongoose.Types.ObjectId.isValid(cartItemId)) {
            throw new ApiError(400, "Invalid cart item ID format.");
        }

        let cartItem = await Cart.findById(cartItemId);

        if (!cartItem) {
            throw new ApiError(404, "Cart item not found.");
        }

        
        if (cartItem.user.toString() !== req.user.id) {
            throw new ApiError(403, "Not authorized to delete this cart item.");
        }

        const deletedItem = await Cart.findByIdAndDelete(cartItemId);
        res.status(200).json({ success: true, message: "Cart item deleted successfully.", deletedItem });

    } catch (error) {
        sendErrorResponse(res, error, "Internal server error while deleting cart item.");
    }
});

module.exports = router;
