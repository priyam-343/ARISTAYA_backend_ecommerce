



require('dotenv').config();

const admin = require('firebase-admin');








const serviceAccountConfig = JSON.parse(process.env.FIREBASE_ADMIN_SDK_CONFIG);






const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;


admin.initializeApp({
  
  credential: admin.credential.cert(serviceAccountConfig),
  
  
  projectId: firebaseProjectId,
});


module.exports = admin;