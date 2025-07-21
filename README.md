ARISTAYA E-commerce Backend
This is the backend API for the ARISTAYA E-commerce Platform.

Features
User Management (Authentication, Authorization with JWT)

Product Management (CRUD operations)

Order Processing & History

Admin Dashboard Data APIs

Payment Gateway Integration (Razorpay)

Mail Service

Forgot & Reset Password

Cart & Wishlist Management

Product Reviews

Tech Stack
NodeJS

ExpressJS

MongoDB (Mongoose)

JWT

Razorpay

Nodemailer

Frontend Counterpart
This backend supports the ARISTAYA E-commerce Frontend application.

Frontend Repository: https://github.com/priyam-343/ARISTAYA_frontend_ecommerce.git

How to Run Locally
1. Prerequisites
Node.js & npm (or Yarn)

MongoDB instance (local or Atlas)

2. Installation
Clone this repository:

git clone https://github.com/priyam-343/ARISTAYA_backend_ecommerce.git
cd ARISTAYA_backend_ecommerce

Install dependencies:

npm install

3. Environment Variables
Create a .env file in the project root.

.env Example:

PORT=2000
MONGO_URL=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
RAZORPAY_API_KEY=your_razorpay_api_key
RAZORPAY_API_SECRET=your_razorpay_api_secret
EMAIL=your_email@example.com
EMAIL_PASSWORD=your_email_password
FORGOT_PASSWORD=http://localhost:3000/user/reset
PAYMENT_SUCCESS=http://localhost:3000/paymentsuccess
ADMIN_KEY=your_admin_secret_key
FRONTEND_URL=http://localhost:3000

4. Run Server
npm start

Server runs on http://localhost:2000 (or specified port).

License
This project is licensed under the MIT License. See the LICENSE file for more information.

Developed by Priyam Kumar