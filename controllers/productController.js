const Product = require('../models/Product');
const mongoose = require('mongoose');

// In-memory fallback storage
let memoryProducts = [
  {
    _id: 'prod_1',
    name: 'Sample Product 1',
    link: 'https://example.com/product1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: 'prod_2',
    name: 'EduPulse Pro',
    link: 'https://example.com/edupulse',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

/**
 * @desc    Get all products
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = async (req, res) => {
  try {
    if (isDbConnected()) {
      const products = await Product.find().sort({ createdAt: -1 });
      return res.status(200).json({ success: true, count: products.length, data: products });
    }
    
    return res.status(200).json({ success: true, count: memoryProducts.length, data: memoryProducts });
  } catch (error) {
    console.error('Get Products Error:', error);
    return res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
};

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res) => {
  try {
    if (isDbConnected()) {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      return res.status(200).json({ success: true, data: product });
    }

    const product = memoryProducts.find((p) => p._id === req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error('Get Product By ID Error:', error);
    return res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
};

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Private (Admin)
 */
const createProduct = async (req, res) => {
  try {
    const { name, link } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Name is required' });
    if (!link || !link.trim()) return res.status(400).json({ success: false, message: 'Link is required' });

    const productData = { name: name.trim(), link: link.trim() };
    let product;

    if (isDbConnected()) {
      product = await Product.create(productData);
    } else {
      product = { _id: 'prod_' + Date.now(), ...productData, createdAt: new Date(), updatedAt: new Date() };
      memoryProducts.unshift(product);
    }

    return res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) {
    console.error('Create Product Error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to create product' });
  }
};

/**
 * @desc    Update a product
 * @route   PUT /api/products/:id
 * @access  Private (Admin)
 */
const updateProduct = async (req, res) => {
  try {
    const { name, link } = req.body;
    let product;

    if (isDbConnected()) {
      product = await Product.findById(req.params.id);
    } else {
      product = memoryProducts.find((p) => p._id === req.params.id);
    }

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const updateFields = {
      ...(name && { name: name.trim() }),
      ...(link && { link: link.trim() }),
      updatedAt: new Date()
    };

    if (isDbConnected()) {
      product = await Product.findByIdAndUpdate(req.params.id, updateFields, { new: true, runValidators: true });
    } else {
      Object.assign(product, updateFields);
    }

    return res.status(200).json({ success: true, message: 'Product updated successfully', data: product });
  } catch (error) {
    console.error('Update Product Error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to update product' });
  }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Private (Admin)
 */
const deleteProduct = async (req, res) => {
  try {
    if (isDbConnected()) {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      await product.deleteOne();
    } else {
      const index = memoryProducts.findIndex((p) => p._id === req.params.id);
      if (index === -1) return res.status(404).json({ success: false, message: 'Product not found' });
      memoryProducts.splice(index, 1);
    }

    return res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete Product Error:', error);
    return res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
