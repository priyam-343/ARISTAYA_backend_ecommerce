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
        
    },
    razorpay_signature: {
        type: String,
        
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
        enum: ['pending', 'completed', 'failed'], 
        default: 'pending',
    },
    paidAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true }); 

module.exports = mongoose.model("payment", PaymentSchema);
