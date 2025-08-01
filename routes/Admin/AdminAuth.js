const express = require('express');
const jwt = require("jsonwebtoken");
const User = require('../../models/User');
const router = express.Router();
const bcrypt = require('bcrypt');
const authAdmin = require("../../middleware/authAdmin");
const { body, validationResult } = require('express-validator');
const dotenv = require('dotenv');
const { ApiError } = require('../../utils/apiError');
const { sendErrorResponse } = require('../../utils/errorMiddleware');

const {
    getAllUsersInfo, getSingleUserInfo, getUserCart, getUserWishlist,
    getUserReview, deleteUserReview, deleteUserCartItem, deleteUserWishlistItem,
    updateProductDetails, userPaymentDetails, addProduct, deleteProduct,
    deleteUserAccount
} = require('../../controller/AdminControl');

const { chartData } = require('../../controller/AllProductInfo');
dotenv.config();

const adminKey = process.env.ADMIN_KEY;

// --- Admin Data Retrieval Routes (Protected by authAdmin) ---
router.get('/getusers', authAdmin, getAllUsersInfo);
router.get('/getuser/:userId', authAdmin, getSingleUserInfo);
router.get('/getcart/:userId', authAdmin, getUserCart);
router.get('/getwishlist/:userId', authAdmin, getUserWishlist);
router.get('/getreview/:userId', authAdmin, getUserReview);
router.get('/getorder/:id', authAdmin, userPaymentDetails);
router.get('/chartdata', authAdmin, chartData);

// --- Admin Login Route ---
router.post('/login', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be blank').exists(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        return sendErrorResponse(res, new ApiError(400, `Validation failed: ${errorMessages}`));
    }

    const { email, password, key } = req.body;
    try {
        let user = await User.findOne({ email });

        if (!user || user.isAdmin !== true || key !== adminKey) {
            throw new ApiError(400, "Invalid credentials or you are not authorized as an Admin.");
        }

        const passComp = await bcrypt.compare(password, user.password);
        if (!passComp) {
            throw new ApiError(400, "Invalid credentials.");
        }

        const tokenPayload = {
            user: {
                id: user._id,
                isAdmin: user.isAdmin
            }
        };

        const authToken = jwt.sign(tokenPayload, process.env.JWT_SECRET);

        res.status(200).json({
            success: true,
            authToken,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                isAdmin: user.isAdmin,
            },
            message: "Admin logged in successfully."
        });

    } catch (error) {
        sendErrorResponse(res, error, "Internal server error during admin login.");
    }
});

// --- Admin Register Route ---
router.post('/register', [
    body('firstName', 'First name must be at least 3 characters').isLength({ min: 3 }),
    body('lastName', 'Last name must be at least 3 characters').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
    body('phoneNumber', 'Enter a valid phone number').isLength({ min: 10, max: 10 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        return sendErrorResponse(res, new ApiError(400, `Validation failed: ${errorMessages}`));
    }
    const { firstName, lastName, email, phoneNumber, password, key } = req.body;

    try {
        let user = await User.findOne({ $or: [{ email: email }, { phoneNumber: phoneNumber }] });
        if (user) {
            throw new ApiError(400, "A user with this email or phone number already exists.");
        }

        if (key !== adminKey) {
            throw new ApiError(403, "Invalid Admin Key. You cannot register as an admin.");
        }

        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(password, salt);

        user = await User.create({
            firstName,
            lastName,
            email,
            phoneNumber,
            password: secPass,
            isAdmin: true
        });

        const tokenPayload = {
            user: {
                id: user._id,
                isAdmin: user.isAdmin
            }
        };

        const authToken = jwt.sign(tokenPayload, process.env.JWT_SECRET);

        res.status(201).json({
            success: true,
            authToken,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                isAdmin: user.isAdmin,
            },
            message: "Admin registered successfully."
        });

    } catch (error) {
        sendErrorResponse(res, error, "Internal server error during admin registration.");
    }
});

// --- Admin Product/Review/Cart/Wishlist Management Routes (Protected by authAdmin) ---
router.post('/addproduct', authAdmin, addProduct);
router.put('/updateproduct/:id', authAdmin, updateProductDetails);
router.delete('/review/:id', authAdmin, deleteUserReview);
router.delete('/usercart/:id', authAdmin, deleteUserCartItem);
router.delete('/userwishlist/:id', authAdmin, deleteUserWishlistItem);
router.delete('/deleteproduct/:id', authAdmin, deleteProduct);

// --- Admin User Account Management ---
router.delete('/deleteuser/:id', authAdmin, deleteUserAccount);

module.exports = router;