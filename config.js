const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const URL = process.env.MONGO_URL;
mongoose.set('strictQuery', true);

const connectToMongo = async () => {
    try {
        let db = await mongoose.connect(URL);
        console.log(`MongoDB Connected: ${db.connection.host}`);
    } catch (error) {
        console.error("MongoDB Connection Error:", error.message); // Use console.error for errors
        process.exit(1); // Exit process with failure code
    }
};

module.exports = connectToMongo;
