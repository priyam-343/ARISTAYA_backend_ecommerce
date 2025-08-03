const mongoose = require('mongoose');
const { Schema } = mongoose;


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
    
    originalPrice: {
        type: Number,
        
        
        required: false
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
    
    author: {
        type: String
    }
}, {
    
    timestamps: true
});

module.exports = mongoose.model("product", ProductSchema);
