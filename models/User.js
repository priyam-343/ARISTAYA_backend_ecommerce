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
        type: Number,
        required: false,
        unique: true,
        sparse: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: false
    },
    isAdmin: {
        default: false,
        type: Boolean
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    profileImage: {
        type: String,
        required: false
    },
    isVerified: {
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
    },
    isFreeShippingEligible: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('user', UserSchema)