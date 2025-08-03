const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { ApiError } = require('../utils/apiError');
const { sendErrorResponse } = require('../utils/errorMiddleware');
const mongoose = require('mongoose'); 





router.post('/addproduct', async (req, res, next) => {
    try {
        const {
            name,
            description,
            price,
            originalPrice, 
            images,
            mainCategory,
            subCategory,
            stock,
            brand,
            author
        } = req.body;

        
        const newProduct = new Product({
            name,
            description,
            price,
            originalPrice, 
            images,
            mainCategory,
            subCategory,
            stock,
            brand,
            author
        });

        const savedProduct = await newProduct.save();

        if (!savedProduct) {
            throw new ApiError(500, "Product could not be saved.");
        }

        res.status(201).json({
            success: true,
            message: "Product added successfully.",
            product: savedProduct
        });

    } catch (error) {
        next(new ApiError(500, error.message || "An error occurred while adding the product."));
    }
});




router.put('/updateproduct/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const {
            name,
            description,
            price,
            originalPrice, 
            images,
            mainCategory,
            subCategory,
            stock,
            brand,
            author
        } = req.body;

        const updateData = {
            name,
            description,
            price,
            originalPrice, 
            images,
            mainCategory,
            subCategory,
            stock,
            brand,
            author
        };

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            throw new ApiError(404, "Product not found.");
        }

        res.status(200).json({
            success: true,
            message: "Product updated successfully.",
            product: updatedProduct
        });

    } catch (error) {
        next(new ApiError(500, error.message || "An error occurred while updating the product."));
    }
});



router.get("/fetchproduct", async (req, res) => {
    try {
        const products = await Product.find({});
        res.status(200).json({ success: true, products });
    } catch (error) {
        sendErrorResponse(res, error, "Internal server error while fetching products.");
    }
});


router.get("/fetchproduct/:id", async (req, res) => {
    try {
        const productId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new ApiError(400, "Invalid product ID format.");
        }

        const product = await Product.findById(productId);
        if (!product) {
            throw new ApiError(404, "Product not found.");
        }
        res.status(200).json({ success: true, product });
    } catch (error) {
        sendErrorResponse(res, error, "Internal server error while fetching product.");
    }
});




router.post("/fetchproduct/type", async (req, res) => {
    try {
        const { userType } = req.body; 
        if (!userType || typeof userType !== 'string' || userType.trim() === '') {
            throw new ApiError(400, "Main category (userType) is required.");
        }
        const products = await Product.find({ mainCategory: userType });
        res.status(200).json({ success: true, products });
    } catch (error) {
        sendErrorResponse(res, error, "Internal server error while fetching products by type.");
    }
});

// REFACTORED: This route now handles both sub-category filtering and sorting.
// Frontend sends a request here when a user selects an option from the filter dropdown.
// CONSIDER: Changing this to a GET request with query parameters for RESTfulness: /api/product/category?mainCategory=men-wear&filter=t-shirts&sort=pricehightolow
router.post("/fetchproduct/category", async (req, res) => {
    try {
        const { userType, userCategory } = req.body; // userType is mainCategory, userCategory is the filter option

        if (!userType || typeof userType !== 'string' || userType.trim() === '') {
            throw new ApiError(400, "Main category (userType) is required.");
        }

        let query = { mainCategory: userType };
        let sort = {};

        if (userCategory && typeof userCategory === 'string' && userCategory.toLowerCase() !== 'all') {
            const filter = userCategory.toLowerCase();

            const sortOptions = {
                'pricelowtohigh': { price: 1 },
                'pricehightolow': { price: -1 },
                'highrated': { rating: -1 },
                'lowrated': { rating: 1 }
            };

            if (sortOptions[filter]) {
                sort = sortOptions[filter];
            } else {
                query.subCategory = filter;
            }
        }

        const products = await Product.find(query).sort(sort);
        res.status(200).json({ success: true, products });
    } catch (error) {
        sendErrorResponse(res, error, "Internal server error while fetching products by category.");
    }
});

module.exports = router;
