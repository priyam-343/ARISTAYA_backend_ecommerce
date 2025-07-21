const express = require('express');
const jwt = require("jsonwebtoken");
const User = require('../models/User');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const authUser = require('../middleware/authUser');
const dotenv = require('dotenv');
const { deleteAllUserData } = require('../controller/deleteUser'); 
dotenv.config()



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
    const { firstName, lastName, email, phoneNumber, password, isAdmin } = req.body 
    try {
        let user = await User.findOne({ $or: [{ email: email }, { phoneNumber: phoneNumber }] });
        if (user) {
            return res.status(400).send({ error: "Sorry a user already exists" })
        }

        
        const salt = await bcrypt.genSalt(10)
        const secPass = await bcrypt.hash(password, salt)

        
        user = await User.create({
            firstName,
            lastName,
            email,
            phoneNumber,
            password: secPass,
            isAdmin 
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
        console.error("Error during user registration:", error.message); 
        res.status(500).send("Internal server error")
    }
})



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
        console.error("Error during user login:", error.message); 
        res.status(500).send("Internal server error002")
    }
}
);


router.get('/getuser', authUser, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password")
        if (!user) { 
            return res.status(404).send("User Not Found");
        }
        success = true
        res.send(user)
        


    } catch (error) {
        console.error("Error fetching user details:", error.message); 
        res.status(500).send("Internal server error") 
    }
}
)



router.put('/updateuser', authUser, async (req, res) => {
    
    const { firstName, lastName, email, phoneNumber, address, zipCode, city, userState } = req.body;

    try {
        
        const updatedFields = {};
        if (firstName !== undefined) { updatedFields.firstName = firstName; }
        if (lastName !== undefined) { updatedFields.lastName = lastName; }
        if (email !== undefined) { updatedFields.email = email; }
        if (phoneNumber !== undefined) { updatedFields.phoneNumber = phoneNumber; }
        if (address !== undefined) { updatedFields.address = address; }
        if (zipCode !== undefined) { updatedFields.zipCode = zipCode; }
        if (city !== undefined) { updatedFields.city = city; }
        if (userState !== undefined) { updatedFields.userState = userState; }

        
        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).send("User Not Found");
        }

        
        user = await User.findByIdAndUpdate(req.user.id, { $set: updatedFields }, { new: true });
        success = true;
        res.status(200).json({ success, user }); 

    } catch (error) {
        console.error("Error updating user details:", error.message); 
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, error: errors });
        }
        res.status(500).send("Internal server error");
    }
})


router.delete('/delete/user/:userId', authUser, deleteAllUserData)
module.exports = router
