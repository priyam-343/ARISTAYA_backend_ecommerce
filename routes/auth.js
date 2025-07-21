const express = require('express');
const jwt = require("jsonwebtoken");
const User = require('../models/User');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const authUser = require('../middleware/authUser');
const dotenv = require('dotenv');
const { deleteAllUserData } = require('../controller/deleteUser'); // Assuming this path is correct
dotenv.config()


// create a user :post "/auth",!auth
let success = false
router.post('/register', [
    body('firstName', 'Enter a valid name').isLength({ min: 1 }),
    body('lastName', 'Enter a valid name').isLength({ min: 1 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
    body('phoneNumber', 'Enter a valid phone number').isLength({ min: 10, max: 10 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() })
    }
    const { firstName, lastName, email, phoneNumber, password, isAdmin } = req.body // Added isAdmin here
    try {
        let user = await User.findOne({ $or: [{ email: email }, { phoneNumber: phoneNumber }] });
        if (user) {
            return res.status(400).send({ error: "Sorry a user already exists" })
        }

        // password hashing
        const salt = await bcrypt.genSalt(10)
        const secPass = await bcrypt.hash(password, salt)

        // create a new user
        user = await User.create({
            firstName,
            lastName,
            email,
            phoneNumber,
            password: secPass,
            isAdmin // Pass isAdmin to the user creation
        })
        const data = {
            user: {
                id: user.id
            }
        }
        success = true
        const authToken = jwt.sign(data, process.env.JWT_SECRET)
        res.send({ success, authToken })
    }
    catch (error) {
        console.error("Error during user registration:", error.message); // Added logging
        res.status(500).send("Internal server error")
    }
})


// login Route
router.post('/login', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be blank').exists(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() })
    }

    const { email, password, } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send({ success, error: "User not found" })
        }
        const passComp = await bcrypt.compare(password, user.password)
        if (!passComp) {
            return res.status(400).send({ success, error: "Please try to login with correct credentials" })
        }

        const data = {
            user: {
                id: user._id
            }
        }

        const authToken = jwt.sign(data, process.env.JWT_SECRET)
        success = true
        res.send({ success, authToken })
    }
    catch (error) {
        console.error("Error during user login:", error.message); // Added logging
        res.status(500).send("Internal server error002")
    }
}
);

// logged in user details
router.get('/getuser', authUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password")
        if (!user) { // Added check if user is found
            return res.status(404).send("User Not Found");
        }
        success = true
        res.send(user)
        // console.log(user.city); // Removed console.log for user.city as it's not needed in production


    } catch (error) {
        console.error("Error fetching user details:", error.message); // Added logging
        res.status(500).send("Internal server error") // Changed from 400 to 500 for server error
    }
}
)


// update user details
router.put('/updateuser', authUser, async (req, res) => {
    // Corrected: Destructure fields directly from req.body
    const { firstName, lastName, email, phoneNumber, address, zipCode, city, userState } = req.body;

    try {
        // Create an object with only the fields that were provided in the request body
        const updatedFields = {};
        if (firstName !== undefined) { updatedFields.firstName = firstName; }
        if (lastName !== undefined) { updatedFields.lastName = lastName; }
        if (email !== undefined) { updatedFields.email = email; }
        if (phoneNumber !== undefined) { updatedFields.phoneNumber = phoneNumber; }
        if (address !== undefined) { updatedFields.address = address; }
        if (zipCode !== undefined) { updatedFields.zipCode = zipCode; }
        if (city !== undefined) { updatedFields.city = city; }
        if (userState !== undefined) { updatedFields.userState = userState; }

        // Find the user by ID from the auth token
        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).send("User Not Found");
        }

        // Update the user document
        user = await User.findByIdAndUpdate(req.user.id, { $set: updatedFields }, { new: true });
        success = true;
        res.status(200).json({ success, user }); // Send back the updated user object

    } catch (error) {
        console.error("Error updating user details:", error.message); // Added logging
        // More specific error handling for validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, error: errors });
        }
        res.status(500).send("Internal server error");
    }
})

// delete user and user data
router.delete('/delete/user/:userId', authUser, deleteAllUserData)
module.exports = router
