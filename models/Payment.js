const mongoose = require('mongoose');
const { Schema } = mongoose;

const PaymentSchema = new Schema({
    razorpay_order_id: {
        type: String,
        required: true,
        unique: true, 
    },
    razorpay_payment_id: {
        type: String,
        // This field will be populated only for successful payments
    },
    razorpay_signature: {
        type: String,
        // This field will be populated only for successful payments
    },
    
    productData: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'product',
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: [1, 'Quantity must be at least 1'],
            },
            // You might want to store price at the time of purchase here as well,
            // to prevent issues if product prices change later.
            // currentPrice: { type: Number, required: true } 
        }
    ],
    userData: { 
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        userEmail: { type: String, required: true },
        phoneNumber: { type: String }, 
        address: { type: String },
        zipCode: { type: String },
        city: { type: String },
        userState: { type: String },
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    totalAmount: {
        type: Number,
        required: true,
        min: [0, 'Total amount cannot be negative'],
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'], // 'failed' is now explicitly included
        default: 'pending',
    },
    failedReason: { // NEW FIELD: To store the reason for payment failure
        type: String,
        default: null, // Default to null if not a failed payment
    },
    paidAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true }); 

module.exports = mongoose.model("payment", PaymentSchema);
