const User = require('../models/User');
const jwt = require("jsonwebtoken");
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const { ApiError } = require('../utils/apiError');
const { sendErrorResponse } = require('../utils/errorMiddleware');
dotenv.config();


const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    },
});


const createAristayaEmail = (title, preheader, content, buttonLink, buttonText) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background-color: #1e1e1e; border: 1px solid #333; border-radius: 12px; overflow: hidden; }
            .header { padding: 40px; text-align: center; }
            .header h1 { color: #FFD700; font-family: 'Cooper Black', serif; margin: 0; }
            .content { padding: 20px 40px; color: #cccccc; }
            .content p { margin-bottom: 20px; line-height: 1.6; }
            .button-container { text-align: center; padding: 20px 40px; }
            .button { 
                background-color: #FFD700; 
                padding: 15px 30px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: bold; 
                font-family: 'Cooper Black', serif; 
                display: inline-block; 
            }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #888888; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>ARISTAYA</h1>
            </div>
            <div class="content">
                <h2>${preheader}</h2>
                <p>${content}</p>
            </div>
            <div class="button-container">
                <!-- Applied inline style to ensure the text color is black -->
                <a href="${buttonLink}" class="button" style="color: #000000;">${buttonText}</a>
            </div>
            <div class="footer">
                <p>If you did not request this, please ignore this email.</p>
                <p>&copy; ${new Date().getFullYear()} ARISTAYA. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

const sendEmailLink = async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) {
            throw new ApiError(400, "Email is required.");
        }

        const findUser = await User.findOne({ email });
        if (!findUser) {
            
            return res.status(200).json({ success: true, message: "If a user with that email exists, a password reset link has been sent." });
        }
        
        
        
        if (!findUser.password) {
            return sendErrorResponse(res, new ApiError(400, "This account was created with Google and does not have a password. Please sign in with Google."));
        }

        const secretKey = findUser._id + process.env.JWT_SECRET;
        const token = jwt.sign({ userID: findUser._id }, secretKey, { expiresIn: '15m' }); 
        const link = `${process.env.FORGOT_PASSWORD}/${findUser._id}/${token}`;

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "ARISTAYA - Password Reset Request",
            html: createAristayaEmail(
                "Password Reset",
                "Forgot your password?",
                "If you've lost your password or wish to reset it, please click the button below. This link will expire in 15 minutes.",
                link,
                "RESET YOUR PASSWORD"
            )
        };

        await transport.sendMail(mailOptions);
        res.status(200).json({ success: true, message: "Password reset link has been sent to your email." });

    } catch (error) {
        if (error instanceof ApiError) {
            sendErrorResponse(res, error);
        } else {
            sendErrorResponse(res, error, "Something went wrong. Please try again.");
        }
    }
};

const setNewPassword = async (req, res) => {
    const { newPassword } = req.body;
    const { id, token } = req.params;
    try {
        if (!newPassword || newPassword.length < 5) {
            throw new ApiError(400, "New password must be at least 5 characters long.");
        }

        const findUser = await User.findById(id);
        if (!findUser) {
            throw new ApiError(404, "User not found.");
        }

        
        if (!findUser.password) {
             throw new ApiError(400, "This account was created with Google and does not have a password. You cannot create one this way.");
        }

        const secretKey = findUser._id + process.env.JWT_SECRET;
        jwt.verify(token, secretKey); 

        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(newPassword, salt);
        await User.findByIdAndUpdate(findUser._id, { $set: { password: hashedPass } });

        res.status(200).json({ success: true, message: "Password has been reset successfully." });

    } catch (error) {
        if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
            return sendErrorResponse(res, new ApiError(400, "Link has expired or is invalid. Please try again."));
        }
        if (error instanceof ApiError) {
            sendErrorResponse(res, error);
        } else {
            sendErrorResponse(res, error, "Something went wrong while setting new password.");
        }
    }
};


const resetPassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        if (!newPassword || newPassword.length < 5) {
            throw new ApiError(400, "New password is required and must be at least 5 characters.");
        }

        const findUser = await User.findById(req.user.id).select('+password'); 
        if (!findUser) {
            throw new ApiError(404, "User not found.");
        }

        
        if (!findUser.password) {
            throw new ApiError(400, "This account was signed up via Google and has no password to change.");
        }

        if (!currentPassword) {
            throw new ApiError(400, "Current password is required to change your password.");
        }

        const passwordCompare = await bcrypt.compare(currentPassword, findUser.password);
        if (!passwordCompare) {
            throw new ApiError(400, "Incorrect current password.");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(newPassword, salt);
        await User.findByIdAndUpdate(findUser._id, { $set: { password: hashedPass } });

        res.status(200).json({ success: true, message: "Password changed successfully." });

    } catch (error) {
        if (error instanceof ApiError) {
            sendErrorResponse(res, error);
        } else {
            sendErrorResponse(res, error, "Something went wrong while resetting password.");
        }
    }
};

module.exports = { sendEmailLink, setNewPassword, resetPassword };
