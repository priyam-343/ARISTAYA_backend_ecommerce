// backend/utils/sendEmail.js

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

/**
 * @fileoverview This utility module provides a function to send emails.
 * It is configured to use environment variables for security.
 */

// Create a Nodemailer transporter object using your existing environment variables
const transporter = nodemailer.createTransport({
    service: 'Gmail', // We will use Gmail for simplicity
    auth: {
        user: process.env.EMAIL, // Your email address from .env file
        pass: process.env.EMAIL_PASSWORD  // Your email password or app password from .env file
    }
});

/**
 * Sends an email using the configured transporter.
 * @param {string} to - The recipient's email address.
 * @param {string} subject - The subject line of the email.
 * @param {string} html - The HTML content of the email body.
 * @returns {Promise<object>} A promise that resolves with the result of the email sending operation.
 */
const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL, // Sender address
            to,                      // Recipient address
            subject,                 // Subject line
            html                     // HTML body
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email.');
    }
};

module.exports = sendEmail;
