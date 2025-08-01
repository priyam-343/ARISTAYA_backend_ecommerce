const express = require('express');
const router = express.Router();
const authUser = require('../middleware/authUser'); // For resetPassword (logged-in user)

const dotenv = require('dotenv');
const { sendEmailLink, resetPassword, setNewPassword } = require('../controller/forgotPasswordController');
dotenv.config();

// Route to send password reset link to email (public)
router.post('/forgot-password', sendEmailLink);

// Route to set new password using link (public)
router.post('/forgot-password/:id/:token', setNewPassword);

// Route to reset password for logged-in user (protected)
router.post('/reset/password', authUser, resetPassword);

module.exports = router;
