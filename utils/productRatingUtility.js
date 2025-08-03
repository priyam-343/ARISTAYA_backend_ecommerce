
const Product = require('../models/Product');
const Review = require('../models/Review');

const updateProductRating = async (productId) => {
    try {
        const reviews = await Review.find({ productId });
        let totalRating = 0;
        if (reviews.length > 0) {
            totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
        }

        const newRating = reviews.length > 0 ? (totalRating / reviews.length) : 0;
        const numOfReviews = reviews.length;

        
        await Product.findByIdAndUpdate(productId, {
            rating: newRating,
            numOfReviews: numOfReviews,
        }, { new: true, runValidators: true }); 

        console.log(`Product ${productId} rating updated: Rating=${newRating.toFixed(2)}, Reviews=${numOfReviews}`);

    } catch (error) {
        
        console.error(`Error updating product rating for product ${productId}:`, error.message);
    }
};

module.exports = { updateProductRating };
