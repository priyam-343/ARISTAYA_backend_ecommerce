require('dotenv').config();
const connectToMongo = require('./config');
const bodyParser = require('body-parser')
const express = require('express')
const cors = require('cors')
const path = require('path');

const auth = require('./routes/auth');
const cart = require('./routes/cart')
const wishlist = require('./routes/wishlist')
const product = require('./routes/product')
const review = require('./routes/review')
const paymentRoute = require('./routes/paymentRoute')
const forgotPassword = require('./routes/forgotPassword')
const AdminRoute = require('./routes/Admin/AdminAuth')

const checkOrigin = require('./middleware/apiAuth');


connectToMongo();

const port = process.env.PORT || 2000;

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.urlencoded({ extended: true }))

app.use(express.json())
app.use(cors());
app.use(express.static(path.join(__dirname, 'build')));

// ➡️ ADD THIS HEALTH CHECK ROUTE HERE ⬅️
// This route will respond to GET requests at the root URL (e.g., https://aristaya-backend-ecommerce.onrender.com/)
// It comes BEFORE checkOrigin to bypass any authentication/origin checks for this specific endpoint.
app.get('/', (req, res) => {
    res.status(200).send('Backend is alive and ready!');
});

app.use(checkOrigin); // Your origin/authentication middleware

app.use('/api/auth', auth)

app.use('/api/product', product)

app.use('/api/cart', cart)

app.use('/api/wishlist', wishlist)

app.use('/api/review', review)

app.use('/api/admin', AdminRoute)


app.use('/api/payment', paymentRoute)

app.use('/api/password', forgotPassword)

app.listen(port, () => {
    console.log(`E-commerce backend listening at http://localhost:${port}`)
})