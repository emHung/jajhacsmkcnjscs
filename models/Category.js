const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index cho tìm kiếm theo tên
CategorySchema.index({ name: 'text' });

// Index cho createdAt để sắp xếp
CategorySchema.index({ createdAt: 1 });

module.exports = mongoose.model('Category', CategorySchema); 