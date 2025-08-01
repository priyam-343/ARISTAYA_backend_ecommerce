const mongoose = require('mongoose');
const { Schema } = mongoose;

// This is the new, simplified, and robust schema for your products.
const ProductSchema = new Schema({
    name: {
        type: String,
        required: [true, "Please enter a product name."]
    },
    description: {
        type: String,
        required: [true, "Please enter a product description."]
    },
    price: {
        type: Number,
        required: [true, "Please enter a product price."],
        default: 0
    },
    images: [
        {
            url: {
                type: String,
                required: true
            }
        }
    ],
    mainCategory: {
        type: String,
        required: [true, "Please specify a main category (e.g., men-wear)."]
    },
    subCategory: {
        type: String,
        required: [true, "Please specify a sub-category (e.g., t-shirts)."]
    },
    stock: {
        type: Number,
        required: [true, "Please enter product stock."],
        default: 1
    },
    brand: {
        type: String,
        required: [true, "Please enter a product brand."]
    },
    rating: {
        type: Number,
        default: 0
    },
    numOfReviews: {
        type: Number,
        default: 0
    },
    // The 'author' field is only relevant for books. It is not required.
    author: {
        type: String
    }
}, {
    // This automatically adds 'createdAt' and 'updatedAt' fields.
    timestamps: true
});

module.exports = mongoose.model("product", ProductSchema);
