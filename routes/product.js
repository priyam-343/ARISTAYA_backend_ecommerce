const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const authUser = require("../middleware/authUser");

// ROUTE 1: Fetch all products (optional, if you have a general product listing)
router.get("/fetchproduct", async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    console.error("Error fetching all products:", error.message);
    res.status(500).send("Internal server error while fetching all products");
  }
});

// NEW ROUTE: Fetch a single product by ID - GET /api/product/fetchproduct/:id
router.get("/fetchproduct/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    console.log(`[Backend Debug] Received request for single product ID: ${productId}`);

    const product = await Product.findById(productId);

    if (!product) {
      console.log(`[Backend Debug] Product with ID ${productId} not found.`);
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    console.log(`[Backend Debug] Found product: ${product.name}`);
    res.json(product);
  } catch (error) {
    console.error(`Error fetching single product with ID ${req.params.id}:`, error.message);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: "Invalid product ID format." });
    }
    res.status(500).send("Internal server error while fetching single product");
  }
});


// ROUTE 2: Fetch products by type (main category from frontend)
router.post("/fetchproduct/type", async (req, res) => {
  try {
    const { userType } = req.body; // This will be 'men-wear', 'women-wear', 'children-wear', 'shoe', 'perfumes', 'book', 'jewelry'

    console.log(`[Backend Debug] Received userType for /fetchproduct/type: ${userType}`);

    let query = {}; // Initialize an empty query object

    // Map the new frontend userType to specific database 'category' and 'type' values
    if (userType === 'men-wear') {
      // Strictly men's apparel and accessories
      query = { type: 'apparel', $or: [{ category: 'men-cloths' }, { category: 'men-accessories' }] };
    } else if (userType === 'women-wear') {
      // Strictly women's apparel and accessories
      query = { type: 'apparel', $or: [{ category: 'women-cloths' }, { category: 'women-accessories' }] };
    } else if (userType === 'children-wear') {
      // Strictly children's apparel
      query = { type: 'apparel', category: 'kids-cloths' };
    } else if (userType === 'shoe') {
      query = { type: 'shoe' };
    } else if (userType === 'perfumes') {
      query = { type: 'fragrance' }; // Query by new 'fragrance' type
    } else if (userType === 'book') {
      query = { type: 'book' };
    } else if (userType === 'jewelry') {
      query = { type: 'jewelry' };
    } else {
      // Fallback for any other userType (should ideally not be hit if categories are well-defined)
      query = { $or: [{ category: userType }, { type: userType }] };
    }

    console.log(`[Backend Debug] Constructed MongoDB query for /fetchproduct/type: ${JSON.stringify(query)}`);

    const products = await Product.find(query);

    console.log(`[Backend Debug] Found ${products.length} products for userType: ${userType}`);

    res.json(products);
  } catch (error) {
    console.error("Error fetching products by type:", error.message);
    res.status(500).send("Internal server error while fetching products by type");
  }
});

// ROUTE 3: Fetch products by specific category (sub-filter from frontend)
router.post("/fetchproduct/category", async (req, res) => {
  try {
    const { userType, userCategory } = req.body; // userType is main category, userCategory is sub-filter

    console.log(`[Backend Debug] Received userType for /fetchproduct/category: ${userType}, userCategory: ${userCategory}`);

    let query = {}; // Base query
    let sort = {}; // Sorting options

    // First, establish the base query based on the main userType (stricter than before)
    if (userType === 'men-wear') {
      query = { type: 'apparel', $or: [{ category: 'men-cloths' }, { category: 'men-accessories' }] };
    } else if (userType === 'women-wear') {
      query = { type: 'apparel', $or: [{ category: 'women-cloths' }, { category: 'women-accessories' }] };
    } else if (userType === 'children-wear') {
      query = { type: 'apparel', category: 'kids-cloths' };
    } else if (userType === 'shoe') {
      query = { type: 'shoe' };
    } else if (userType === 'perfumes') {
      query = { type: 'fragrance' };
    } else if (userType === 'book') {
      query = { type: 'book' };
    } else if (userType === 'jewelry') {
      query = { type: 'jewelry' };
    } else {
      query = { $or: [{ category: userType }, { type: userType }] };
    }

    // Apply sub-filters based on userCategory
    if (userCategory && userCategory.toLowerCase() !== 'all') {
      switch (userCategory.toLowerCase()) {
        // Price Sorting
        case 'pricelowtohigh':
          sort = { price: 1 }; // Ascending
          break;
        case 'pricehightolow':
          sort = { price: -1 }; // Descending
          break;
        // Rating Sorting
        case 'highrated':
          sort = { rating: -1 }; // Descending
          break;
        case 'lowrated':
          sort = { rating: 1 }; // Ascending
          break;

        // Specific sub-categories for Apparel
        case 't-shirts':
        case 'jeans':
        case 'formalwear':
          if (userType === 'men-wear') {
              query.category = 'men-cloths';
              query.name = new RegExp(userCategory.replace('-', ' '), 'i'); // Regex for partial match
          }
          break;
        case 'dresses':
        case 'tops':
        case 'skirts':
          if (userType === 'women-wear') {
              query.category = 'women-cloths';
              query.name = new RegExp(userCategory, 'i');
          }
          break;
        case 'boys':
        case 'girls':
        case 'infants':
          if (userType === 'children-wear') {
              query.category = 'kids-cloths';
              query.name = new RegExp(userCategory, 'i');
          }
          break;
        case 'accessories': // For both men and women wear
            if (userType === 'men-wear') {
                query.category = 'men-accessories';
            } else if (userType === 'women-wear') {
                query.category = 'women-accessories';
            }
            break;

        // Specific sub-categories for Shoes
        case 'running':
        case 'football':
        case 'formal':
        case 'casual':
          if (userType === 'shoe') {
              query.category = userCategory.toLowerCase();
          }
          break;

        // Specific sub-categories for Perfumes
        case 'men':
        case 'women':
        case 'unisex':
          if (userType === 'perfumes') {
              query.category = `${userCategory.toLowerCase()}-perfume`; // Matches 'men-perfume', 'women-perfume', 'unisex-perfume'
          }
          break;

        // Specific sub-categories for Books
        case 'scifi':
        case 'business':
        case 'mystery':
        case 'cookbooks':
        case 'fiction':
        case 'self-help':
          if (userType === 'book') {
              query.category = userCategory.toLowerCase();
          }
          break;

        // Specific sub-categories for Jewelry
        case 'necklace':
        case 'earrings':
        case 'rings':
        case 'bracelet':
        case 'watches':
          if (userType === 'jewelry') {
              query.category = userCategory.toLowerCase();
          }
          break;

        default:
          // If no specific filter, just use the base query
          break;
      }
    }

    console.log(`[Backend Debug] Constructed MongoDB query for /fetchproduct/category: ${JSON.stringify(query)}`);
    console.log(`[Backend Debug] Constructed MongoDB sort for /fetchproduct/category: ${JSON.stringify(sort)}`);

    const products = await Product.find(query).sort(sort);

    console.log(`[Backend Debug] Found ${products.length} products for userType: ${userType}, userCategory: ${userCategory}`);

    res.json(products);
  } catch (error) {
    console.error("Error fetching products by category (sub-filter):", error.message);
    res.status(500).send("Internal server error while fetching products by category");
  }
});

module.exports = router;
