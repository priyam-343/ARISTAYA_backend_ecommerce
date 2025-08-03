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
const sendEmail = require('../../utils/sendEmail');

const {
    getAllUsersInfo, getSingleUserInfo, getUserCart, getUserWishlist,
    getUserReview, deleteUserReview, deleteUserCartItem, deleteUserWishlistItem,
    updateProductDetails, userPaymentDetails, addProduct, deleteProduct,
    deleteUserAccount
} = require('../../controller/AdminControl');

const { chartData } = require('../../controller/AllProductInfo');
dotenv.config();

const adminKey = process.env.ADMIN_KEY;
const backendUrl = process.env.BACKEND_URL;
const frontendUrl = process.env.FRONTEND_URL_1;


router.get('/getusers', authAdmin, getAllUsersInfo);
router.get('/getuser/:userId', authAdmin, getSingleUserInfo);
router.get('/getcart/:userId', authAdmin, getUserCart);
router.get('/getwishlist/:userId', authAdmin, getUserWishlist);
router.get('/getreview/:userId', authAdmin, getUserReview);
router.get('/getorder/:id', authAdmin, userPaymentDetails);
router.get('/chartdata', authAdmin, chartData);


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
        
        
        if (!user || user.isAdmin !== true) {
            console.log("Login attempt failed: User not found or is not an admin.");
            throw new ApiError(400, "Invalid credentials or you are not authorized as an Admin.");
        }

        
        
        if (!user.isApproved) {
             console.log("Login attempt blocked: User is not approved.");
             throw new ApiError(403, "Your admin account is pending approval from a super-admin. Please wait for them to approve your request.");
        }
        
        
        const passComp = await bcrypt.compare(password, user.password);
        if (!passComp) {
            console.log("Login attempt failed: Incorrect password.");
            throw new ApiError(400, "Invalid credentials.");
        }

        if (key !== adminKey) {
            console.log("Login attempt failed: Invalid admin key.");
            throw new ApiError(400, "Invalid credentials or you are not authorized as an Admin.");
        }

        const tokenPayload = {
            user: {
                id: user._id,
                isAdmin: user.isAdmin
            }
        };

        const authToken = jwt.sign(tokenPayload, process.env.JWT_SECRET);
        console.log(`Successful login for approved admin: ${user.email}`);

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
        
        const phoneNumberAsNumber = Number(phoneNumber);

        
        let user = await User.findOne({ $or: [{ email: email }, { phoneNumber: phoneNumberAsNumber }] });
        
        if (user) {
            
            if (user.email === email) {
                
                if (user.isAdmin === true && user.isApproved === false) {
                     const approvalToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
                     const approvalLink = `${backendUrl}/api/admin/approve?token=${approvalToken}`;
                     const emailHtml = `
                         <div style="font-family: 'Cooper Black', serif; background-color: #000000; color: #ffffff; padding: 20px; text-align: center; border: 1px solid #FFD700; border-radius: 8px;">
                             <h1 style="color: #FFD700; font-family: 'Cooper Black', serif;">ARISTAYA Admin Approval</h1>
                             <h2 style="color: #ffffff; font-family: 'Cooper Black', serif;">New Admin Registration Pending</h2>
                             <p style="color: #cccccc; font-size: 16px; font-family: 'Cooper Black', serif;">A new admin, <b>${firstName} ${lastName}</b> with email <b>${email}</b>, has requested access. Please click the button below to approve their account.</p>
                             <a href="${approvalLink}" style="display: inline-block; margin-top: 20px; padding: 15px 30px; background-color: #FFD700; color: #000000; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px; font-family: 'Cooper Black', serif;">
                                 APPROVE ADMIN
                             </a>
                             <p style="color: #cccccc; font-size: 14px; margin-top: 20px; font-family: 'Cooper Black', serif;">This link is valid for 24 hours. Please do not share this link.</p>
                         </div>
                     `;
                      await sendEmail(process.env.ADMIN_EMAIL, 'New Admin Account Approval Required', emailHtml);
                      return res.status(200).json({
                         success: true,
                         message: "An admin account with this email is already pending approval. We have resent the approval email."
                      });
                }
                
                if (user.isAdmin === true && user.isApproved === true) {
                    throw new ApiError(400, "A user with this email is already an approved admin.");
                }
                
                throw new ApiError(400, "The email you entered is already registered as a regular user.");
            }
            
            
            
            if (user.phoneNumber === phoneNumberAsNumber) {
                throw new ApiError(400, "The phone number you entered is already in use.");
            }
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
            isAdmin: true,
            isApproved: false, 
            provider: 'password'
        });
        
        console.log(`New admin registered: ${user.email}. isApproved flag set to: ${user.isApproved}`);

        const approvalToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        const approvalLink = `${backendUrl}/api/admin/approve?token=${approvalToken}`;
        const emailHtml = `
            <div style="font-family: 'Cooper Black', serif; background-color: #000000; color: #ffffff; padding: 20px; text-align: center; border: 1px solid #FFD700; border-radius: 8px;">
                <h1 style="color: #FFD700; font-family: 'Cooper Black', serif;">ARISTAYA Admin Approval</h1>
                <h2 style="color: #ffffff; font-family: 'Cooper Black', serif;">New Admin Registration Pending</h2>
                <p style="color: #cccccc; font-size: 16px; font-family: 'Cooper Black', serif;">A new admin, <b>${firstName} ${lastName}</b> with email <b>${email}</b>, has requested access. Please click the button below to approve their account.</p>
                <a href="${approvalLink}" style="display: inline-block; margin-top: 20px; padding: 15px 30px; background-color: #FFD700; color: #000000; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px; font-family: 'Cooper Black', serif;">
                    APPROVE ADMIN
                </a>
                <p style="color: #cccccc; font-size: 14px; margin-top: 20px; font-family: 'Cooper Black', serif;">This link is valid for 24 hours. Please do not share this link.</p>
            </div>
        `;

        await sendEmail(process.env.ADMIN_EMAIL, 'New Admin Account Approval Required', emailHtml);

        res.status(201).json({
            success: true,
            message: "Admin registration successful! Your account is pending approval from a super-admin. You will be notified when your account is approved."
        });

    } catch (error) {
        sendErrorResponse(res, error, "Internal server error during admin registration.");
    }
});


router.get('/approve', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return sendErrorResponse(res, new ApiError(400, 'Approval token is missing.'));
    }
    
    try {
        const data = jwt.verify(token, process.env.JWT_SECRET);
        let user = await User.findById(data.id);
        
        if (!user || user.isAdmin !== true) {
            throw new ApiError(404, 'User not found, is not an admin, or approval token is invalid.');
        }

        if (user.isApproved) {
            return res.status(200).send(`
                <div style="font-family: 'Cooper Black', serif; background-color: #000000; color: #ffffff; padding: 20px; text-align: center; border: 1px solid #FFD700; border-radius: 8px;">
                    <h1 style="color: #FFD700; font-family: 'Cooper Black', serif;">Admin Account Already Approved</h1>
                    <p style="color: #cccccc; font-size: 16px; font-family: 'Cooper Black', serif;">The admin account for ${user.email} has already been approved.</p>
                    <a href="${frontendUrl}/admin/login" style="display: inline-block; margin-top: 20px; padding: 15px 30px; background-color: #FFD700; color: #000000; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px; font-family: 'Cooper Black', serif;">
                        GO TO ADMIN LOGIN
                    </a>
                </div>
            `);
        }
        
        user.isApproved = true;
        await user.save();
        
        const successEmailHtml = `
            <div style="font-family: 'Cooper Black', serif; background-color: #000000; color: #ffffff; padding: 20px; text-align: center; border: 1px solid #FFD700; border-radius: 8px;">
                <h1 style="color: #FFD700; font-family: 'Cooper Black', serif;">Your ARISTAYA Admin Account has been Approved!</h1>
                <p style="color: #cccccc; font-size: 16px; font-family: 'Cooper Black', serif;">Congratulations! Your admin account has been approved by a super-admin. You can now log in and manage the site.</p>
                <a href="${frontendUrl}/admin/login" style="display: inline-block; margin-top: 20px; padding: 15px 30px; background-color: #FFD700; color: #000000; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px; font-family: 'Cooper Black', serif;">
                    GO TO ADMIN LOGIN
                </a>
            </div>
        `;
        await sendEmail(user.email, 'Your ARISTAYA Admin Account has been Approved!', successEmailHtml);

        res.status(200).send(`
            <div style="font-family: 'Cooper Black', serif; background-color: #000000; color: #ffffff; padding: 20px; text-align: center; border: 1px solid #FFD700; border-radius: 8px;">
                <h1 style="color: #FFD700; font-family: 'Cooper Black', serif;">Admin Approval Successful!</h1>
                <p style="color: #cccccc; font-size: 16px; font-family: 'Cooper Black', serif;">The admin account for <b>${user.email}</b> has been successfully approved. They have been notified via email.</p>
                <a href="${frontendUrl}/admin/login" style="display: inline-block; margin-top: 20px; padding: 15px 30px; background-color: #FFD700; color: #000000; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px; font-family: 'Cooper Black', serif;">
                        GO TO ADMIN LOGIN
                    </a>
            </div>
        `);
        
    } catch (error) {
        console.error("Error during admin approval:", error);
        const errorMessage = error.name === 'TokenExpiredError' ? 'Approval link has expired.' : 'Invalid approval link.';
        return res.status(401).send(`
            <div style="font-family: 'Cooper Black', serif; background-color: #000000; color: #ffffff; padding: 20px; text-align: center; border: 1px solid #FFD700; border-radius: 8px;">
                <h1 style="color: #FFD700; font-family: 'Cooper Black', serif;">Error!</h1>
                <p style="color: #cccccc; font-size: 16px; font-family: 'Cooper Black', serif;">${errorMessage}</p>
            </div>
        `);
    }
});


router.post('/addproduct', authAdmin, addProduct);
router.put('/updateproduct/:id', authAdmin, updateProductDetails);
router.delete('/review/:id', authAdmin, deleteUserReview);
router.delete('/usercart/:id', authAdmin, deleteUserCartItem);
router.delete('/userwishlist/:id', authAdmin, deleteUserWishlistItem);
router.delete('/deleteproduct/:id', authAdmin, deleteProduct);


router.delete('/deleteuser/:id', authAdmin, deleteUserAccount);

module.exports = router;
