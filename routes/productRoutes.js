const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cấu hình storage cho Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

const upload = multer({ storage: storage });

// Route thêm sản phẩm
router.post('/', auth, admin, upload.single('image'), async (req, res) => {
  try {
    console.log('=== Request Body ===');
    console.log(req.body);
    console.log('=== File Info ===');
    console.log(req.file);

    const productData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      import_price: req.body.import_price,
      category: req.body.category,
    };

    // Thêm image URL nếu có upload file
    if (req.file) {
      productData.image = {
        url: req.file.path,
        public_id: req.file.filename
      };
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      status: 'success',
      data: product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
}); 