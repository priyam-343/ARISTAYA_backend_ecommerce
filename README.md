ARISTAYA E-commerce Backend This is the robust backend application powering the ARISTAYA E-commerce Platform. It's built to handle all the heavy lifting, from user authentication and product management to secure payment processing and admin controls.

Features This backend provides a comprehensive set of APIs to support the frontend application:

User & Admin Authentication: Secure JWT-based authentication for both regular users and administrators.

User Management: APIs for user registration, login, profile updates, and account deletion. Includes features for email verification (powered by Firebase) and a secure forgot/reset password flow.

Admin Controls: Extensive endpoints for administrators to manage products, users, orders, and reviews. This includes:

Centralized user management: View user profiles, carts, wishlists, and reviews.

Admin approval system: New admin registrations require approval from a super-admin.

Product CRUD: Create, read, update, and delete product listings.

Analytics: Provides data for dashboard statistics, including revenue, order trends, and user activity.

Dynamic Free Shipping: Admins can toggle free shipping eligibility for individual users.

Product Catalog: APIs for fetching products by type, category, or individual ID.

Shopping Cart & Wishlist: Manages user carts and wishlists, allowing items to be added, removed, and fetched.

Secure Payment Processing: Integrates with Razorpay for handling payments, using a robust webhook system as the single source of truth for transaction statuses.

Email Service: Integrated mail service for order confirmations, password resets, and admin approvals.

Tech Stack Node.js

Express.js

MongoDB (Mongoose ODM)

JWT (JSON Web Tokens) for authentication

Bcrypt for password hashing

Razorpay for payment gateway

Nodemailer for email services

HTML-PDF for generating PDF receipts

Firebase Admin SDK for email verification and Google Sign-In integration

Frontend Counterpart This backend serves APIs to the ARISTAYA E-commerce Frontend. Frontend Repository: https://github.com/priyam-343/ARISTAYA_frontend_ecommerce.git

How to Run Locally Prerequisites Node.js & npm (or Yarn)

MongoDB instance (local or cloud-hosted like MongoDB Atlas)

Razorpay account (for API keys and webhook setup)

Gmail account (for Nodemailer email sending)

Firebase project (for Admin SDK configuration)

Installation Clone this repository:

git clone https://github.com/priyam-343/ARISTAYA_backend_ecommerce.git

Navigate into the project directory:

cd ARISTAYA_backend_ecommerce

Install dependencies:

npm install

Environment Variables Create a .env file in the project root and add the following variables.

PORT=2000
MONGO_URL=YOUR_MONGODB_CONNECTION_STRING
JWT_SECRET=YOUR_JWT_SECRET_KEY
RAZORPAY_API_KEY=YOUR_RAZORPAY_KEY_ID
RAZORPAY_API_SECRET=YOUR_RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_RAZORPAY_WEBHOOK_SECRET
PAYMENT_SUCCESS=YOUR_FRONTEND_URL/paymentsuccess
EMAIL=YOUR_GMAIL_ADDRESS@gmail.com
EMAIL_PASSWORD=YOUR_GMAIL_APP_PASSWORD
FORGOT_PASSWORD=YOUR_FRONTEND_URL/user/reset
ADMIN_KEY=YOUR_ADMIN_SECRET_KEY
ADMIN_EMAIL=YOUR_SUPER_ADMIN_EMAIL@gmail.com
FRONTEND_URL_1=YOUR_FRONTEND_URL
BACKEND_URL=YOUR_BACKEND_URL
FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
FIREBASE_ADMIN_SDK_CONFIG={YOUR_FIREBASE_ADMIN_SDK_JSON_CONFIG}

Run Application npm start

The backend server will start on http://localhost:2000.

Developed by Priyam Kumar