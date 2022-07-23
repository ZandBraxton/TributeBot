const { MongoClient } = require("mongodb");

const mongoClient = new MongoClient(process.env.MONGO_URI);

module.exports = mongoClient;
