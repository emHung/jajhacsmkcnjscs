const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  refreshToken: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// Compound index cho email và role
UserSchema.index({ email: 1, role: 1 });

// Index cho refreshToken vì được dùng để tìm kiếm user khi refresh
UserSchema.index({ refreshToken: 1 });

// Index cho tìm kiếm theo tên
UserSchema.index({ name: 'text' });

module.exports = mongoose.model('User', UserSchema); 