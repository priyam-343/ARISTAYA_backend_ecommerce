const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const authUser = require("../middleware/authUser");

// get all cart products
router.get("/fetchcart", authUser, async (req, res) => {
    try {
        const cart = await Cart.find({ user: req.user.id })
            // CRITICAL CHANGE HERE: Added 'numOfReviews' to the select string
            .populate("productId", "name price images rating numOfReviews type") 
            .populate("user", "firstName lastName email"); 
        res.send(cart);
    } catch (error) {
        console.error("Error fetching cart:", error.message);
        res.status(500).send("Internal server error while fetching cart");
    }
});

// add to cart
router.post("/addcart", authUser, async (req, res) => {
    try {
        const { _id, quantity } = req.body; // _id here is productId
        const findProduct = await Cart.findOne({ $and: [{ productId: _id }, { user: req.user.id }] })
        if (findProduct) {
            return res.status(400).json({ msg: "Product already in a cart" })
        }
        else {
            const cart = new Cart({
                user: req.user.id, // User ID from authUser middleware
                productId: _id, // Product ID
                quantity,
            });
            const savedCart = await cart.save();
            res.status(200).json({ success: true, savedCart });
        }
    } catch (error) {
        console.error("Error adding to cart:", error.message);
        res.status(500).send("Internal server error while adding to cart");
    }
});

// remove from cart
router.delete("/deletecart/:id", authUser, async (req, res) => {
    const cartItemId = req.params.id; // This 'id' should be the _id of the cart document
    try {
        let cartItem = await Cart.findById(cartItemId);

        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Cart item not found." });
        }

        if (cartItem.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, message: "Not authorized to delete this cart item." });
        }

        const deletedItem = await Cart.findByIdAndDelete(cartItemId);
        res.status(200).json({ success: true, message: "Cart item deleted successfully.", deletedItem });

    } catch (error) {
        console.error("Error deleting cart item:", error.message);
        res.status(500).send("Internal server error while deleting cart item");
    }
});

module.exports = router;
