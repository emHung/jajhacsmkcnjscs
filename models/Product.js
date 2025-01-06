const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    default: null
  },
  import_price: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    default: 0
  },
  unit: {
    type: String,
    default: 'Cái',
    enum: [
      'Cái',
      'Hộp', 
      'Kg',
      'Cặp',
      'Con',
      'Bịch',
      'Cuộn',
      'Hũ',
      'Bộ',
      'Cây',
      'Túi',
      'Hủ',
      'Sợi',
      'Tấm',
      'M',
      'Bóng',
      'Lít',
      'Chai',
      'Thùng',
      'Gói',
      'Lon',
      'Đôi'
    ]
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  image: {
    url: {
      type: String,
      default: null
    },
    publicId: {
      type: String,
      default: null
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index cho tìm kiếm theo tên
ProductSchema.index({ name: 'text' });

// Compound index cho name và category vì thường query theo danh mục
ProductSchema.index({ name: 1, category: 1 });

// Index cho price để hỗ trợ sắp xếp và tìm kiếm theo khoảng giá
ProductSchema.index({ price: 1 });

// Index cho import_price
ProductSchema.index({ import_price: 1 });

// Index cho createdAt để hỗ trợ sắp xếp theo thời gian
ProductSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', ProductSchema); 
