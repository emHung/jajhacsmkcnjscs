const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('Debug auth middleware:', { token });

    if (!token) {
      return res.status(401).json({ 
        status: 'error',
        message: 'No token, authorization denied' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Error in auth middleware:', err);
    res.status(500).json({
      status: 'error',
      message: 'Server Error'
    });
  }
}; 