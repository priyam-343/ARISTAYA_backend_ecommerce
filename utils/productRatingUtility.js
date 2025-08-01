// utils/productRatingUtility.js
const Product = require('../models/Product');
const Review = require('../models/Review');

/**
 * Recalculates and updates the average rating and number of reviews for a product.
 * This should be called whenever a review is added, updated, or deleted.
 * @param {string} productId The ID of the product to update.
 */
const updateProductRating = async (productId) => {
    try {
        const reviews = await Review.find({ productId });
        let totalRating = 0;
        if (reviews.length > 0) {
            totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
        }

        const newRating = reviews.length > 0 ? (totalRating / reviews.length) : 0;
        const numOfReviews = reviews.length;

        // Update the product document
        await Product.findByIdAndUpdate(productId, {
            rating: newRating,
            numOfReviews: numOfReviews,
        }, { new: true, runValidators: true }); // `runValidators` ensures schema validation on update

        console.log(`Product ${productId} rating updated: Rating=${newRating.toFixed(2)}, Reviews=${numOfReviews}`);

    } catch (error) {
        // Log the error but don't re-throw, as it shouldn't block the main operation
        console.error(`Error updating product rating for product ${productId}:`, error.message);
    }
};

module.exports = { updateProductRating };
