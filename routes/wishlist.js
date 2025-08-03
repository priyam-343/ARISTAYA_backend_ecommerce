const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const authUser = require('../middleware/authUser');
const { ApiError } = require('../utils/apiError');
const { sendErrorResponse } = require('../utils/errorMiddleware');
const mongoose = require('mongoose'); 

router.get('/fetchwishlist', authUser, async (req, res) => {
    try {
        const wishlistData = await Wishlist.find({ user: req.user.id }).populate("productId");
        res.status(200).json({ success: true, wishlistItems: wishlistData, message: "Wishlist fetched successfully." });
    } catch (error) {
        sendErrorResponse(res, error, "Something went wrong while fetching wishlist.");
    }
});

router.post('/addwishlist', authUser, async (req, res) => {
    try {
        const { _id } = req.body; 

        if (!mongoose.Types.ObjectId.isValid(_id)) {
            throw new ApiError(400, "Invalid product ID format.");
        }

        const findProduct = await Wishlist.findOne({ $and: [{ productId: _id }, { user: req.user.id }] });
        if (findProduct) {
            throw new ApiError(400, "Product already in wishlist.");
        } else {
            const wishlistData = new Wishlist({ user: req.user.id, productId: _id });
            const savedWishlist = await wishlistData.save();
            res.status(201).json({ success: true, savedWishlist, message: "Product added to wishlist successfully." });
        }
    } catch (error) {
        sendErrorResponse(res, error, "Something went wrong while adding to wishlist.");
    }
});

router.delete('/deletewishlist/:id', authUser, async (req, res) => {
    const { id } = req.params; 
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new ApiError(400, "Invalid wishlist item ID format.");
        }

        const wishlistItem = await Wishlist.findById(id);
        if (!wishlistItem) {
            throw new ApiError(404, "Wishlist item not found.");
        }

        
        if (wishlistItem.user.toString() !== req.user.id) {
            throw new ApiError(403, "Not authorized to delete this wishlist item.");
        }

        const result = await Wishlist.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Wishlist item deleted successfully.", deletedItem: result });
    } catch (error) {
        sendErrorResponse(res, error, "Something went wrong while deleting wishlist item.");
    }
});

module.exports = router;
