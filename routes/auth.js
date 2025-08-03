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
const sendEmail = require('../utils/sendEmail');

// ** NEW IMPORTS FOR FIREBASE **
const admin = require('../config/firebaseAdmin');
const { route } = require('./product');

dotenv.config();

/**
 * @route   POST /auth/register
 * @desc    Register a new user and send a verification email
 * @access  Public
 * ** CRITICAL FIX: The logic has been refactored to use separate queries for email and phone number to avoid ambiguity and correctly return specific error messages. **
 */
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
        // ** FIX: Check for duplicate email separately **
        let existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            if (!existingUserByEmail.isVerified) {
                // If unverified, resend the welcome link
                const verificationToken = jwt.sign({ id: existingUserByEmail.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
                const verificationLink = `${process.env.FRONTEND_URL_1}/auth/verify-page?token=${verificationToken}`;
                const emailHtml = `
                    <div style="font-family: 'Cooper Black', serif; background-color: #000000; color: #ffffff; padding: 20px; text-align: center; border: 1px solid #FFD700; border-radius: 8px;">
                        <h1 style="color: #FFD700;">ARISTAYA</h1>
                        <h2 style="color: #ffffff;">Hello ${existingUserByEmail.firstName},</h2>
                        <p style="color: #cccccc; font-size: 16px;">We observed you are trying to sign in your ARISTAYA account. Please click the Welcome button below to proceed and securely log in.</p>
                        <a href="${verificationLink}" style="display: inline-block; margin-top: 20px; padding: 15px 30px; background-color: #FFD700; color: #000000; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px;">
                            WELCOME
                        </a>
                        <p style="color: #cccccc; font-size: 14px; margin-top: 20px;">This link is valid for 15 minutes. If you did not request this, you can safely ignore this email.</p>
                    </div>
                `;
                await sendEmail(email, 'Your ARISTAYA WELCOME Link for Login', emailHtml);
                return res.status(200).json({
                    success: true,
                    message: "A user with this email or phone number already exists, but the account is unverified. We have resent the WELCOME link to your email."
                });
            }
            // If the email is already registered and verified, throw a specific error
            throw new ApiError(400, "The email you entered is already registered");
        }

        // ** FIX: Check for duplicate phone number separately **
        let existingUserByPhone = await User.findOne({ phoneNumber });
        if (existingUserByPhone) {
            // If the phone number is already in use, throw a specific error
            throw new ApiError(400, "The phone number you entered is already in use");
        }

        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(password, salt);

        // Create user with isVerified set to false
        const newUser = await User.create({
            firstName,
            lastName,
            email,
            phoneNumber,
            password: secPass,
            isVerified: false,
            provider: 'password'
        });
        
        console.log(`[Register] New user created with ID: ${newUser._id}, initial isVerified: ${newUser.isVerified}`);

        // Generate a verification token (not an auth token)
        const verificationToken = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
        const verificationLink = `${process.env.FRONTEND_URL_1}/auth/verify-page?token=${verificationToken}`;
        
        // Send the branded verification email
        const emailHtml = `
            <div style="font-family: 'Cooper Black', serif; background-color: #000000; color: #ffffff; padding: 20px; text-align: center; border: 1px solid #FFD700; border-radius: 8px;">
                <h1 style="color: #FFD700;">ARISTAYA</h1>
                <h2 style="color: #ffffff;">Hello ${firstName},</h2>
                <p style="color: #cccccc; font-size: 16px;">Welcome to ARISTAYA! To complete your registration, please click the "WELCOME" button below to verify your email address.</p>
                <a href="${verificationLink}" style="display: inline-block; margin-top: 20px; padding: 15px 30px; background-color: #FFD700; color: #000000; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px;">
                    WELCOME
                </a>
                <p style="color: #cccccc; font-size: 14px; margin-top: 20px;">This link is valid for 15 minutes. If you did not register for this account, you can safely ignore this email.</p>
            </div>
        `;

        await sendEmail(email, 'Your ARISTAYA WELCOME Link to Verify Email', emailHtml);

        res.status(201).json({
            success: true,
            message: "Registration successful! Please check your email to verify your account."
        });

    } catch (error) {
        sendErrorResponse(res, error, "Internal server error during registration.");
    }
});

/**
 * @route   POST /auth/verify-email-post
 * @desc    Verify user's email with a token and log them in (POST method)
 * @access  Public (via token in body)
 */
router.post('/verify-email-post', async (req, res) => {
    console.log('----------------------------------------------------');
    console.log('[Verify-Email-Post] Received POST request to verify email.');
    console.log('----------------------------------------------------');

    const { token } = req.body;
    if (!token) {
        console.error('[Verify-Email-Post] Verification failed: Token is missing from the request body.');
        return sendErrorResponse(res, new ApiError(400, 'Verification token is missing.'));
    }
    console.log('[Verify-Email-Post] Received verification token:', token);

    try {
        const data = jwt.verify(token, process.env.JWT_SECRET);
        console.log('[Verify-Email-Post] Token successfully verified. Decoded user ID:', data.id);

        let user = await User.findById(data.id);
        if (!user) {
            console.error('[Verify-Email-Post] Verification failed: User not found for ID:', data.id);
            return sendErrorResponse(res, new ApiError(404, 'User not found or verification failed.'));
        }
        
        console.log(`[Verify-Email-Post] User found (ID: ${user._id}). Current isVerified status: ${user.isVerified}`);
        
        user.isVerified = true;
        await user.save();
        console.log(`[Verify-Email-Post] User saved successfully. New isVerified status: ${user.isVerified}`);

        const authToken = jwt.sign({ user: { id: user._id } }, process.env.JWT_SECRET);
        console.log(`[Verify-Email-Post] Generated new auth token for user: ${user._id}`);

        res.status(200).json({
            success: true,
            message: "Email verified successfully!",
            authToken,
            user: user.toObject({ getters: true, virtuals: false })
        });

    } catch (error) {
        console.error("Error during email verification:", error);
        const errorMessage = error.name === 'TokenExpiredError' ? 'Verification link has expired. Please try registering again.' : 'Invalid verification link.';
        return sendErrorResponse(res, new ApiError(401, errorMessage));
    }
});

/**
 * @route   POST /auth/login
 * @desc    Login a user with email and password
 * @access  Public
 */
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
        console.log(`[Login Attempt] Received login request for email: ${email}`);
        const user = await User.findOne({ email });

        // Fix 1: Specific feedback for non-existent users
        if (!user) {
            console.log(`[Login Attempt] User not found for email: ${email}.`);
            throw new ApiError(404, "User not found. Please sign up first.");
        }
        
        console.log(`[Login Attempt] User found. ID: ${user._id}.`);
        console.log(`[Login Attempt] User isVerified status from database: ${user.isVerified}`);

        if (!user.isVerified) {
            console.log(`[Login Attempt] Login blocked: User is not verified.`);
            throw new ApiError(403, "Please check your email to verify your account before logging in.");
        }

        // Fix 2: Check for Google-registered users before attempting password compare
        if (!user.password) {
            console.log(`[Login Attempt] Login blocked: Account registered via Google. `);
            throw new ApiError(401, "This email is registered with Google. Please use the 'Sign in with Google' button.");
        }
        
        const passComp = await bcrypt.compare(password, user.password);
        if (!passComp) {
            console.log(`[Login Attempt] Password mismatch for user ID: ${user._id}.`);
            // Fix 3: More specific feedback for invalid password
            throw new ApiError(401, "Invalid password.");
        }

        const data = { user: { id: user._id } };
        const authToken = jwt.sign(data, process.env.JWT_SECRET);
        const userResponse = await User.findById(user._id).select("-password");
        console.log(`[Login Attempt] Login successful for user ID: ${user._id}.`);
        res.status(200).json({ success: true, authToken, user: userResponse, message: "User logged in successfully." });

    } catch (error) {
        // Use the specific error from the `throw` statement if available, otherwise fallback.
        if (error instanceof ApiError) {
            sendErrorResponse(res, error);
        } else {
            sendErrorResponse(res, error, "Internal server error during login.");
        }
    }
});

/**
 * @route   POST /auth/google
 * @desc    Authenticate user with Google via Firebase ID Token
 * @access  Public
 */
router.post('/google', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
        return sendErrorResponse(res, new ApiError(400, 'ID token is missing.'));
    }
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { email, name, picture } = decodedToken;

        let user = await User.findOne({ email });

        if (user) {
            // ** This is the key fix **
            // We check for the existence of the 'password' field to determine the provider.
            // This is more robust as it works for both new and existing users.
            if (user.password) {
                throw new ApiError(401, "This email is already registered with a password. Please sign in with your password.");
            }
            
            // If the user exists and has no password field, we assume it's a social login user
            // and proceed with logging them in.
        } else {
            const nameParts = name ? name.split(' ') : ['', ''];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            
            user = await User.create({
                firstName,
                lastName,
                email,
                profileImage: picture,
                isVerified: true, // Google sign-in users are automatically verified
                provider: 'google' // ** Added provider field here for new users **
            });
        }
        
        const data = { user: { id: user.id } };
        const authToken = jwt.sign(data, process.env.JWT_SECRET);
        
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.status(200).json({ success: true, authToken, user: userResponse, message: "User logged in successfully via Google." });

    } catch (error) {
        if (error instanceof ApiError) {
            sendErrorResponse(res, error);
        } else {
            console.error("Error verifying Google ID token:", error);
            sendErrorResponse(res, new ApiError(401, 'Access Denied: Invalid or expired token.'));
        }
    }
});

/**
 * @route   GET /auth/getuser
 * @desc    Fetch user details
 * @access  Private
 */
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

/**
 * @route   PUT /auth/updateuser
 * @desc    Update user profile
 * @access  Private
 * ** UPDATED: Added logic to check for existing email and phone number to avoid 500 errors. **
 */
router.put('/updateuser', authUser, async (req, res) => {
    const userId = req.user.id;
    const { email, phoneNumber, ...updateData } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return sendErrorResponse(res, new ApiError(404, "User not found."));
        }

        // CRITICAL FIX: Ensure the backend returns the exact string expected by the frontend toast.
        // The check for an existing email or phone number is essential to avoid a 500 error.
        
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                // The backend error message now exactly matches the frontend toast
                return sendErrorResponse(res, new ApiError(400, "The email you entered is already registered"));
            }
        }

        if (phoneNumber && phoneNumber !== user.phoneNumber) {
            const phoneExists = await User.findOne({ phoneNumber });
            if (phoneExists) {
                // The backend error message now exactly matches the frontend toast
                return sendErrorResponse(res, new ApiError(400, "The phone number you entered is already in use"));
            }
        }

        // Prepare the final update object
        const finalUpdateData = { ...updateData };
        if (email) finalUpdateData.email = email;
        if (phoneNumber) finalUpdateData.phoneNumber = phoneNumber;

        // Perform the update
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: finalUpdateData },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updatedUser) {
            return sendErrorResponse(res, new ApiError(404, "User not found after update."));
        }

        res.status(200).json({ success: true, user: updatedUser, message: "User profile updated successfully." });
    } catch (error) {
        // Fallback for any other potential errors gracefully
        sendErrorResponse(res, error, "Internal server error while updating user.");
    }
});

/**
 * @route   DELETE /auth/delete/user
 * @desc    Delete user account and all associated data
 * @access  Private
 */
router.delete('/delete/user', authUser, deleteAllUserData);

module.exports = router;