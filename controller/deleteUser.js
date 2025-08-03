const User = require("../models/User");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const Review = require("../models/Review");
const { ApiError } = require('../utils/apiError');
const { sendErrorResponse } = require('../utils/errorMiddleware');

const deleteAllUserData = async (req, res) => {
    
    const userId = req.user.id;

    try {
        const findUser = await User.findById(userId);
        if (!findUser) {
            throw new ApiError(404, "User not found.");
        }

        
        await Promise.all([
            User.findByIdAndDelete(userId),
            Cart.deleteMany({ user: userId }),
            Wishlist.deleteMany({ user: userId }),
            Review.deleteMany({ user: userId })
        ]);

        res.status(200).json({ success: true, message: "Account and all associated data deleted successfully." });

    } catch (error) {
        sendErrorResponse(res, error, "Something went wrong while deleting user data.");
    }
};

module.exports = { deleteAllUserData };
