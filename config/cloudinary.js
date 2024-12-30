const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Cấu hình Cloudinary với các thông tin từ .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dxycvcgne',
  api_key: process.env.CLOUDINARY_API_KEY || '412312353971613',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'cAy8reZuHwTMdpYdaXvrR4m7Tjw'
});

// Log để kiểm tra cấu hình
console.log('=== Cloudinary Config ===');
console.log('Cloud name:', cloudinary.config().cloud_name);
console.log('API Key:', cloudinary.config().api_key ? 'Present' : 'Missing');
console.log('API Secret:', cloudinary.config().api_secret ? 'Present' : 'Missing');
console.log('=======================');

module.exports = cloudinary; 