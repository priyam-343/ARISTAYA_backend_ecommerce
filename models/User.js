const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: false
    },
    phoneNumber: {
        // Change `required` to `false` for social logins
        type: Number,
        required: false, // Changed from `true`
        unique: true,
        sparse: true // Allows `null` values to be unique, preventing a new user with `phoneNumber: null` from failing
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        // Change `required` to `false` for social logins
        type: String,
        required: false // Changed from `true`
    },
    isAdmin: {
        default: false,
        type: Boolean
    },
    isApproved: {
        // **CRITICAL FIX:** This field must exist for admin approval logic.
        type: Boolean,
        default: false
    },
    profileImage: {
        // **NEW FIELD** to store the user's Google profile picture
        type: String,
        required: false // Not required for non-social logins
    },
    isVerified: { // ** NEW FIELD for email verification **
        type: Boolean,
        default: false,
    },
    address: {
        type: String
    },
    zipCode: {
        type: String
    },
    city: {
        type: String
    },
    userState: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('user', UserSchema)
