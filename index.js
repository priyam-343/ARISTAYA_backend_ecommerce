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
const paymentRoute = require('./routes/paymentRoute') // This is your paymentRoutes.js
const forgotPassword = require('./routes/forgotPassword')
const AdminRoute = require('./routes/Admin/AdminAuth')
// const dotenv = require('dotenv'); // REMOVED: Already called at the top
const checkOrigin = require('./middleware/apiAuth');
// dotenv.config() // REMOVED: Already called at the top

connectToMongo();

const port = process.env.PORT || 2000;

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.urlencoded({ extended: true }))

app.use(express.json())
app.use(cors());
app.use(express.static(path.join(__dirname, 'build')));

app.use(checkOrigin);

app.use('/api/auth', auth)

app.use('/api/product', product)

app.use('/api/cart', cart)

app.use('/api/wishlist', wishlist)

app.use('/api/review', review)

app.use('/api/admin', AdminRoute)

// FIX IS HERE: Change the mount path for paymentRoute
app.use('/api/payment', paymentRoute) // CHANGED from '/api' to '/api/payment'

app.use('/api/password', forgotPassword)

app.listen(port, () => {
    console.log(`E-commerce backend listening at http://localhost:${port}`)
})
