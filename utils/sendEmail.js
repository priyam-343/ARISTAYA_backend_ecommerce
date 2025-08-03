

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();



const transporter = nodemailer.createTransport({
    service: 'Gmail', 
    auth: {
        user: process.env.EMAIL, 
        pass: process.env.EMAIL_PASSWORD  
    }
});

const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL, 
            to,                      
            subject,                 
            html                     
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
