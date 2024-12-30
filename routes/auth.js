const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { register, login, getProfile } = require('../controllers/authController');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', register);

// @route   POST api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', login);

// @route   GET api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, getProfile);

// @route   POST api/auth/refresh-token
// @desc    Get new access token using refresh token
// @access  Public
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required'
      });
    }

    // Find user with this refresh token
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }

    // Verify refresh token
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      
      // Generate new access token
      const accessToken = jwt.sign(
        {
          user: {
            id: user.id,
            role: user.role
          }
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Generate new refresh token
      const newRefreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      // Update refresh token in database
      user.refreshToken = newRefreshToken;
      await user.save();

      // Return new tokens
      res.json({
        status: 'success',
        message: 'Tokens refreshed successfully',
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        }
      });

    } catch (err) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token'
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: err.message
    });
  }
});

module.exports = router; 