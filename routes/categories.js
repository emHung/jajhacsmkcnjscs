const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Category = require('../models/Category');

// Get all categories (public)
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json({
      status: 'success',
      data: categories
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Server Error'
    });
  }
});

// Test categories availability
router.get('/test', async (req, res) => {
  try {
    const categories = await Category.find();
    if (categories.length > 0) {
      res.json({
        status: 'success',
        message: 'Data available',
        count: categories.length,
        data: categories
      });
    } else {
      res.json({
        status: 'success',
        message: 'No data available',
        count: 0,
        data: []
      });
    }
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Server Error',
      error: err.message
    });
  }
});

// Add category (admin only)
router.post('/', [auth, admin], async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = new Category({
      name,
      description
    });
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Update category (admin only)
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(category);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Delete category (admin only)
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    // Check if category exists
    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({
      status: 'success',
      message: 'Category deleted successfully'
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Server Error'
    });
  }
});

module.exports = router; 