// backend/config/firebaseAdmin.js

// Load environment variables from your .env file
// This line is correct and should remain at the top.
require('dotenv').config();

const admin = require('firebase-admin');

// --- START OF REQUIRED CHANGES ---

// 1. DELETE this line (it tries to find a local file which doesn't exist on Render):
// const serviceAccount = require('../serviceAccountKey.json');

// 2. ADD these lines to read the JSON content from the environment variable
//    you set on Render (FIREBASE_ADMIN_SDK_CONFIG) and parse it.
const serviceAccountConfig = JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG);

// --- END OF REQUIRED CHANGES ---


// Get the Firebase Project ID from your backend/.env file
// This line is correct and remains as it is.
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;

// Initialize the Firebase Admin SDK
admin.initializeApp({
  // 3. CHANGE this line to use the parsed serviceAccountConfig
  credential: admin.credential.cert(serviceAccountConfig),
  
  // This line remains correct as it is.
  projectId: firebaseProjectId,
});

// Export the initialized admin object for use in other files
module.exports = admin;