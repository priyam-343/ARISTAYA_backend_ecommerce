// backend/config/firebaseAdmin.js

// Load environment variables from your .env file
require('dotenv').config();

const admin = require('firebase-admin');

// IMPORTANT: The path to your service account key JSON file.
// We are assuming you placed the file in your backend's root folder.
// The '../' means 'go up one directory level' from the current file (config).
const serviceAccount = require('../serviceAccountKey.json');

// Get the Firebase Project ID from your backend/.env file
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;

// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: firebaseProjectId,
});

// Export the initialized admin object for use in other files
module.exports = admin;
