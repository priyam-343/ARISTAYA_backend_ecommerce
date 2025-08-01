const express = require('express');
const jwt = require("jsonwebtoken");
const User = require('../models/User');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const authUser = require('../middleware/authUser');
const dotenv = require('dotenv');
const { ApiError } = require('../utils/apiError');
const { sendErrorResponse } = require('../utils/errorMiddleware');
const { deleteAllUserData } = require('../controller/deleteUser');
dotenv.config();

router.post('/register', [
    body('firstName', 'Enter a valid name').isLength({ min: 1 }),
    body('lastName', 'Enter a valid name').isLength({ min: 1 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
    body('phoneNumber', 'Enter a valid phone number').isLength({ min: 10, max: 10 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        return sendErrorResponse(res, new ApiError(400, `Validation failed: ${errorMessages}`));
    }
    const { firstName, lastName, email, phoneNumber, password } = req.body;
    try {
        let user = await User.findOne({ $or: [{ email: email }, { phoneNumber: phoneNumber }] });
        if (user) {
            throw new ApiError(400, "A user with this email or phone number already exists.");
        }

        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(password, salt);

        user = await User.create({
            firstName,
            lastName,
            email,
            phoneNumber,
            password: secPass,
        });
        const data = { user: { id: user.id } };
        const authToken = jwt.sign(data, process.env.JWT_SECRET);
        const userResponse = await User.findById(user.id).select("-password");
        res.status(201).json({ success: true, authToken, user: userResponse, message: "User registered successfully." });

    } catch (error) {
        sendErrorResponse(res, error, "Internal server error during registration.");
    }
});

router.post('/login', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be blank').exists(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        return sendErrorResponse(res, new ApiError(400, `Validation failed: ${errorMessages}`));
    }
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            throw new ApiError(400, "Invalid credentials.");
        }

        const passComp = await bcrypt.compare(password, user.password);
        if (!passComp) {
            throw new ApiError(400, "Invalid credentials.");
        }

        const data = { user: { id: user._id } };
        const authToken = jwt.sign(data, process.env.JWT_SECRET);
        const userResponse = await User.findById(user._id).select("-password");
        res.status(200).json({ success: true, authToken, user: userResponse, message: "User logged in successfully." });

    } catch (error) {
        sendErrorResponse(res, error, "Internal server error during login.");
    }
});

router.get('/getuser', authUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            throw new ApiError(404, "User not found.");
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        sendErrorResponse(res, error, "Internal server error while fetching user.");
    }
});

router.put('/updateuser', authUser, async (req, res) => {
    const { firstName, lastName, email, phoneNumber, address, zipCode, city, userState } = req.body;
    try {
        const updatedFields = { firstName, lastName, email, phoneNumber, address, zipCode, city, userState };
        const user = await User.findByIdAndUpdate(req.user.id, { $set: updatedFields }, { new: true }).select("-password");
        if (!user) {
            throw new ApiError(404, "User Not Found");
        }
        res.status(200).json({ success: true, user, message: "User profile updated successfully." });
    } catch (error) {
        sendErrorResponse(res, error, "Internal server error while updating user.");
    }
});

router.delete('/delete/user', authUser, deleteAllUserData);

module.exports = router;
