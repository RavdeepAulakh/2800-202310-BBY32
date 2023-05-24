// Load environment variables from the .env file
require('dotenv').config();

// Retrieve MongoDB connection configuration from environment variables
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;

// Import the required modules
const MongoClient = require("mongodb").MongoClient;

// Create the MongoDB Atlas connection URI using the retrieved configuration
const atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/test`;

// Create a new MongoClient instance with the connection URI and options
const database = new MongoClient(atlasURI, { useNewUrlParser: true, useUnifiedTopology: true });

// Export the database instance for use in other modules
module.exports = database;
