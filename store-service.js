const mongoose = require('mongoose');

// Define the schema for items
const ItemSchema = new mongoose.Schema({
  body: String,           // Body of the item
  title: String,          // Title of the item
  postDate: Date,         // Date when the item was posted
  featureImage: String,   // URL of the featured image
  published: Boolean,     // Whether the item is published or not
  price: Number,          // Price of the item
  category: String       // Category of the item
});

// Define the schema for categories
const CategorySchema = new mongoose.Schema({
  category: String       // Category name
});

// Create models based on the schemas
const Item = mongoose.model('Item', ItemSchema);
const Category = mongoose.model('Category', CategorySchema);

// Initialize the database connection
function initialize() {
  return mongoose.connect('mongodb+srv://manveer:pompi123@cluster0.msxw4i0.mongodb.net/', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
}

// Retrieve all items from the database
function getAllItems() {
  return Item.find();
}

// Retrieve an item by its ID
function getItemById(id) {
  return Item.findById(id);
}

// Add a new item to the database
function addItem(itemData) {
  return Item.create(itemData);
}

// Retrieve all categories from the database
function getCategories() {
  return Category.find();
}

// Add a new category to the database
function addCategory(categoryData) {
  return Category.create(categoryData);
}

module.exports = {
  initialize,
  getAllItems,
  getItemById,
  addItem,
  getCategories,
  addCategory
};
