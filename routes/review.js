const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const authUser = require('../middleware/authUser');
const { ApiError } = require('../utils/apiError');
const { sendErrorResponse } = require('../utils/errorMiddleware');
const { updateProductRating } = require('../utils/productRatingUtility'); // Import the utility
const mongoose = require('mongoose'); // For ObjectId validation

// --- API Routes ---

router.post('/fetchreview/:id', async (req, res) => {
    try {
        const { filterType } = req.body;
        const productId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new ApiError(400, "Invalid product ID format.");
        }

        let sortQuery = { createdAt: -1 }; // Default to newest first

        switch (filterType) {
            case 'old': sortQuery = { createdAt: 1 }; break;
            case 'positivefirst': sortQuery = { rating: -1 }; break;
            case 'negativefirst': sortQuery = { rating: 1 }; break;
            default: sortQuery = { createdAt: -1 }; // Fallback for invalid filterType
        }

        const reviews = await Review.find({ productId }).populate("user", "firstName lastName").sort(sortQuery);
        const product = await Product.findById(productId);

        res.status(200).json({
            success: true,
            reviews,
            rating: product ? product.rating : 0,
            numOfReviews: product ? product.numOfReviews : 0,
            message: "Reviews fetched successfully."
        });
    } catch (error) {
        sendErrorResponse(res, error, "Internal server error while fetching reviews.");
    }
});

router.post('/addreview', authUser, async (req, res) => {
    try {
        const { id, comment, rating } = req.body; // id is productId

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new ApiError(400, "Invalid product ID format.");
        }
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            throw new ApiError(400, "Rating must be a number between 1 and 5.");
        }
        if (typeof comment !== 'string' || comment.trim() === '') {
            throw new ApiError(400, "Comment cannot be empty.");
        }

        const findReview = await Review.findOne({ user: req.user.id, productId: id });

        if (findReview) {
            throw new ApiError(400, "You have already reviewed this product.");
        }

        let reviewData = new Review({ user: req.user.id, productId: id, comment, rating });
        await reviewData.save();

        // FIX: Call the utility to update product rating
        await updateProductRating(id);

        reviewData = await reviewData.populate("user", "firstName lastName");

        res.status(201).json({ success: true, message: "Review added successfully.", review: reviewData });
    } catch (error) {
        sendErrorResponse(res, error, "Something went wrong while adding review.");
    }
});

router.delete('/deletereview/:id', authUser, async (req, res) => {
    try {
        const reviewId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            throw new ApiError(400, "Invalid review ID format.");
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            throw new ApiError(404, "Review not found.");
        }

        // Ensure the user is authorized to delete this specific review
        if (review.user.toString() !== req.user.id) {
            throw new ApiError(403, "Not authorized to delete this review.");
        }

        const productIdToUpdate = review.productId;
        await Review.findByIdAndDelete(reviewId);

        // FIX: Call the utility to update product rating
        await updateProductRating(productIdToUpdate);

        res.status(200).json({ success: true, message: "Review deleted successfully." });
    } catch (error) {
        sendErrorResponse(res, error, "Something went wrong while deleting review.");
    }
});

router.put('/editreview', authUser, async (req, res) => {
    try {
        const { id, comment, rating } = req.body; // id is reviewId

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new ApiError(400, "Invalid review ID format.");
        }
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            throw new ApiError(400, "Rating must be a number between 1 and 5.");
        }
        if (typeof comment !== 'string' || comment.trim() === '') {
            throw new ApiError(400, "Comment cannot be empty.");
        }

        const review = await Review.findById(id);
        if (!review) {
            throw new ApiError(404, "Review not found.");
        }

        // Ensure the user is authorized to edit this specific review
        if (review.user.toString() !== req.user.id) {
            throw new ApiError(403, "Not authorized to edit this review.");
        }

        review.comment = comment;
        review.rating = rating;
        await review.save();

        // FIX: Call the utility to update product rating
        await updateProductRating(review.productId);

        res.status(200).json({ success: true, message: "Review edited successfully." });
    } catch (error) {
        sendErrorResponse(res, error, "Something went wrong while editing review.");
    }
});

module.exports = router;
