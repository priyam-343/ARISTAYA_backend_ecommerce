const mongoose = require('mongoose');
const { Schema } = mongoose;

const PaymentSchema = new Schema({
    razorpay_order_id: {
        type: String,
        required: true,
        unique: true, // Ensure order IDs are unique
    },
    razorpay_payment_id: {
        type: String,
        // Not required initially, only after successful verification
    },
    razorpay_signature: {
        type: String,
        // Not required initially, only after successful verification
    },
    // CRITICAL FIX: Define schema for productData array elements
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
            // Optionally, store the price at the time of purchase here to prevent price changes affecting old orders
            // priceAtPurchase: { type: Number, required: true },
        }
    ],
    userData: { // Snapshot of user details at time of purchase
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        userEmail: { type: String, required: true },
        phoneNumber: { type: String }, // Changed to String to handle leading zeros and formatting
        address: { type: String },
        zipCode: { type: String },
        city: { type: String },
        userState: { type: String },
    },
    user: { // The actual user ID linked to the payment
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
        enum: ['pending', 'completed', 'failed'], // Define allowed statuses
        default: 'pending',
    },
    paidAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true }); // `timestamps: true` adds createdAt and updatedAt automatically

module.exports = mongoose.model("payment", PaymentSchema);
