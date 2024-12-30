const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index cho tìm kiếm theo tên và email
CustomerSchema.index({ name: 'text', email: 'text' });

// Index cho phone vì thường tìm kiếm theo số điện thoại
CustomerSchema.index({ phone: 1 });

// Compound index cho name và email
CustomerSchema.index({ name: 1, email: 1 });

// Index cho createdAt để sắp xếp
CustomerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Customer', CustomerSchema); 