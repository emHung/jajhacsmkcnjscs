const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');

// @route   GET api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', [auth, admin], async (req, res) => {
  try {
    const users = await User.find().select('-password -refreshToken');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/users/test
// @desc    Test users availability
// @access  Private
router.get('/test', auth, async (req, res) => {
  try {
    const users = await User.find().select('-password -refreshToken');
    if (users.length > 0) {
      res.json({
        status: 'success',
        message: 'Data available',
        count: users.length,
        data: users
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

// @route   GET api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    // Lấy thông tin user từ token
    const userId = req.user.user.id;
    const userRole = req.user.user.role;
    
    console.log('Debug /me route:', { userId, userRole });
    
    const user = await User.findById(userId).select('-password -refreshToken');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      data: user
    });
  } catch (err) {
    console.error('Error in /me route:', err);
    res.status(500).json({
      status: 'error',
      message: 'Server Error'
    });
  }
});

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private (Admin or Own User)
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshToken');
    
    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        message: 'User not found' 
      });
    }

    // Check if user is admin or requesting their own profile
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ 
        status: 'error',
        message: 'Not authorized to view this user' 
      });
    }

    res.json({
      status: 'success',
      data: user
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Server Error'
    });
  }
});

// @route   PUT api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy người dùng'
      });
    }

    // Kiểm tra quyền: admin hoặc chính user đó
    if (req.user.user.role !== 'admin' && req.user.user.id !== req.params.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Không có quyền chỉnh sửa người dùng này'
      });
    }

    // Nếu không phải admin, không cho phép thay đổi role
    if (req.user.user.role !== 'admin' && req.body.role) {
      delete req.body.role;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).select('-password -refreshToken');

    res.json({
      status: 'success',
      message: 'Cập nhật người dùng thành công',
      data: updatedUser
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server',
      error: err.message
    });
  }
});

// @route   DELETE api/users/:id
// @desc    Delete user
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy người dùng'
      });
    }

    // Kiểm tra quyền: admin hoặc chính user đó
    if (req.user.user.role !== 'admin' && req.user.user.id !== req.params.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Không có quyền xóa người dùng này'
      });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({
      status: 'success',
      message: 'Xóa người dùng thành công'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server',
      error: err.message
    });
  }
});

module.exports = router; 