const User = require("../models/User");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Payment = require("../models/Payment");
const mongoose = require('mongoose');

const { ApiError } = require('../utils/apiError');
const { sendErrorResponse } = require('../utils/errorMiddleware');
const { updateProductRating } = require('../utils/productRatingUtility'); // Import the utility

// Helper for consistent ID validation
const validateObjectId = (id, idName = "ID") => {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, `Invalid or missing ${idName} format.`);
    }
};

const getAllUsersInfo = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json({ success: true, users });
    } catch (error) {
        sendErrorResponse(res, error, "Error fetching all users.");
    }
};

const getSingleUserInfo = async (req, res) => {
    const { userId } = req.params;
    try {
        validateObjectId(userId, "user ID");
        const user = await User.findById(userId).select('-password');
        if (!user) {
            throw new ApiError(404, "User not found.");
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        sendErrorResponse(res, error, "Error fetching user information.");
    }
};

const getUserCart = async (req, res) => {
    const { userId } = req.params;
    try {
        validateObjectId(userId, "user ID");
        const userCart = await Cart.find({ user: userId })
            .populate("productId", "name price images rating type numOfReviews mainCategory");
        res.status(200).json({ success: true, cartItems: userCart });
    } catch (error) {
        sendErrorResponse(res, error, "Error fetching user cart.");
    }
};

const getUserWishlist = async (req, res) => {
    const { userId } = req.params;
    try {
        validateObjectId(userId, "user ID");
        const userWishlist = await Wishlist.find({ user: userId })
            .populate("productId", "name price images rating type numOfReviews mainCategory");
        res.status(200).json({ success: true, wishlistItems: userWishlist });
    } catch (error) {
        sendErrorResponse(res, error, "Error fetching user wishlist.");
    }
};

const getUserReview = async (req, res) => {
    const { userId } = req.params;
    try {
        validateObjectId(userId, "user ID");
        const userReviews = await Review.find({ user: userId })
            .populate("productId", "name price images rating type numOfReviews mainCategory")
            .populate("user", "firstName lastName");
        res.status(200).json({ success: true, reviews: userReviews });
    } catch (error) {
        sendErrorResponse(res, error, "Error fetching user reviews.");
    }
};

const deleteUserReview = async (req, res) => {
    const { id } = req.params;
    try {
        validateObjectId(id, "review ID");
        const review = await Review.findById(id);

        if (!review) {
            throw new ApiError(404, "Review not found.");
        }

        const productIdToUpdate = review.productId;
        await Review.findByIdAndDelete(id);

        await updateProductRating(productIdToUpdate); // Call the utility to update product rating

        res.status(200).json({ success: true, message: "Review deleted successfully." });
    } catch (error) {
        sendErrorResponse(res, error, "Something went wrong while deleting the review.");
    }
};

const deleteUserCartItem = async (req, res) => {
    const { id } = req.params;
    try {
        validateObjectId(id, "cart item ID");
        let deletedCartItem = await Cart.findByIdAndDelete(id);
        if (!deletedCartItem) {
            throw new ApiError(404, "Cart item not found.");
        }
        res.status(200).json({ success: true, message: "Cart item deleted successfully." });
    } catch (error) {
        sendErrorResponse(res, error, "Something went wrong while deleting the cart item.");
    }
};

const deleteUserWishlistItem = async (req, res) => {
    const { id } = req.params;
    try {
        validateObjectId(id, "wishlist item ID");
        let deletedWishlistItem = await Wishlist.findByIdAndDelete(id);
        if (!deletedWishlistItem) {
            throw new ApiError(404, "Wishlist item not found.");
        }
        res.status(200).json({ success: true, message: "Wishlist item deleted successfully." });
    } catch (error) {
        sendErrorResponse(res, error, "Something went wrong while deleting the wishlist item.");
    }
};

const updateProductDetails = async (req, res) => {
    let updateProduct = req.body.productDetails;
    const { id } = req.params;

    try {
        validateObjectId(id, "product ID");

        if (!updateProduct || Object.keys(updateProduct).length === 0) {
            throw new ApiError(400, "No product details provided for update.");
        }

        // Validate and parse numerical fields
        if (updateProduct.price !== undefined) {
            const price = parseFloat(updateProduct.price);
            if (isNaN(price) || price <= 0) {
                throw new ApiError(400, "Price must be a positive number.");
            }
            updateProduct.price = price;
        }
        if (updateProduct.rating !== undefined) {
            const rating = parseFloat(updateProduct.rating);
            if (isNaN(rating) || rating < 0 || rating > 5) { // Assuming rating is 0-5
                throw new ApiError(400, "Rating must be a number between 0 and 5.");
            }
            updateProduct.rating = rating;
        }
        if (updateProduct.stock !== undefined) {
            const stock = parseInt(updateProduct.stock, 10);
            if (isNaN(stock) || stock < 0) {
                throw new ApiError(400, "Stock must be a non-negative integer.");
            }
            updateProduct.stock = stock;
        }

        const product = await Product.findById(id);
        if (!product) {
            throw new ApiError(404, "Product not found.");
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, { $set: updateProduct }, { new: true, runValidators: true });

        res.status(200).json({ success: true, message: "Product updated successfully.", product: updatedProduct });
    } catch (error) {
        sendErrorResponse(res, error, "Internal server error while updating product.");
    }
};

const userPaymentDetails = async (req, res) => {
    const { id } = req.params;
    try {
        validateObjectId(id, "user ID");
        const payments = await Payment.find({ user: id })
            .populate({
                path: 'productData.productId',
                select: 'name price images rating type numOfReviews mainCategory'
            })
            .populate('user', 'firstName lastName email phoneNumber address city userState zipCode');

        res.status(200).json({ success: true, payments });
    } catch (error) {
        sendErrorResponse(res, error, "Error fetching user payment details.");
    }
};

const addProduct = async (req, res) => {
    const { name, brand, price, mainCategory, subCategory, images, rating, author, description, stock } = req.body;

    try {
        // Basic input validation
        if (!name || !price || !mainCategory || !images || !description || stock === undefined) {
            throw new ApiError(400, "Missing required product fields: name, price, mainCategory, images, description, stock.");
        }
        if (typeof name !== 'string' || name.trim() === '') {
            throw new ApiError(400, "Product name must be a non-empty string.");
        }
        if (typeof price !== 'number' || price <= 0) {
            throw new ApiError(400, "Price must be a positive number.");
        }
        if (!Array.isArray(images) || images.length === 0 || !images.every(img => typeof img === 'object' && img !== null && typeof img.url === 'string' && img.url.trim() !== '')) {
            throw new ApiError(400, "Images must be a non-empty array of objects with 'url' strings.");
        }
        if (typeof stock !== 'number' || stock < 0) {
            throw new ApiError(400, "Stock must be a non-negative number.");
        }
        if (rating !== undefined && (typeof rating !== 'number' || rating < 0 || rating > 5)) {
            throw new ApiError(400, "Rating must be a number between 0 and 5.");
        }

        const newProduct = await Product.create({
            name,
            brand,
            price,
            mainCategory,
            subCategory,
            images,
            rating,
            author,
            description,
            stock
        });
        res.status(201).json({ success: true, product: newProduct, message: "Product added successfully." });
    } catch (error) {
        sendErrorResponse(res, error, "Internal server error while adding product.");
    }
};

const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        validateObjectId(id, "product ID");
        let deletedProduct = await Product.findByIdAndDelete(id);
        if (!deletedProduct) {
            throw new ApiError(404, "Product not found.");
        }
        res.status(200).json({ success: true, message: "Product deleted successfully." });
    } catch (error) {
        sendErrorResponse(res, error, "Something went wrong while deleting the product.");
    }
};

const deleteUserAccount = async (req, res) => {
    const { id } = req.params;

    try {
        validateObjectId(id, "user ID");

        const userToDelete = await User.findById(id);
        if (!userToDelete) {
            throw new ApiError(404, "User not found.");
        }

        // IMPORTANT: Delete ALL associated data for the user being deleted
        await Promise.all([
            User.findByIdAndDelete(id),
            Cart.deleteMany({ user: id }),
            Wishlist.deleteMany({ user: id }),
            Review.deleteMany({ user: id }),
            Payment.deleteMany({ user: id })
        ]);

        res.status(200).json({ success: true, message: "User account and all associated data deleted successfully by Admin." });

    } catch (error) {
        sendErrorResponse(res, error, "Error deleting user account by Admin.");
    }
};

module.exports = {
    getAllUsersInfo,
    getSingleUserInfo,
    getUserCart,
    getUserWishlist,
    getUserReview,
    deleteUserReview,
    deleteUserCartItem,
    deleteUserWishlistItem,
    updateProductDetails,
    userPaymentDetails,
    addProduct,
    deleteProduct,
    deleteUserAccount
};