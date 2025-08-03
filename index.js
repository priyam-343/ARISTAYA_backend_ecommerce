require('dotenv').config();
const connectToMongo = require('./config');
const express = require('express');
const cors = require('cors');
const path = require('path');


const auth = require('./routes/auth');
const cart = require('./routes/cart');
const wishlist = require('./routes/wishlist');
const product = require('./routes/product');
const review = require('./routes/review');
const paymentRoute = require('./routes/paymentRoute');
const forgotPassword = require('./routes/forgotPassword');
const AdminRoute = require('./routes/Admin/AdminAuth');





const { ApiError } = require('./utils/apiError');
const { sendErrorResponse } = require('./utils/errorMiddleware');


connectToMongo();

const port = process.env.PORT || 2000;

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));







const allowedOrigins = [
  'https://aristaya.vercel.app', 
  'http://localhost:3000',      
];

app.use(cors({
  origin: function (origin, callback) {
    
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, 
}));


app.use(express.static(path.join(__dirname, 'build')));





app.use('/api/auth', auth);
app.use('/api/product', product);
app.use('/api/cart', cart);
app.use('/api/wishlist', wishlist);
app.use('/api/review', review);
app.use('/api/admin', AdminRoute);
app.use('/api/payment', paymentRoute);
app.use('/api/password', forgotPassword);


app.use((err, req, res, next) => {
    sendErrorResponse(res, err, "An unexpected server error occurred.");
});


app.listen(port, () => {
    console.log(`E-commerce backend listening at http://localhost:${port}`);
});
