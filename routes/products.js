const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Product = require('../models/Product');
const Category = require('../models/Category');
const upload = require('../config/multer.js');
const cloudinary = require('../config/cloudinary');

// Kiểm tra xem upload đã được cấu hình đúng chưa
console.log('=== Multer Upload Check ===');
console.log('Upload object:', upload);
console.log('Upload single method:', typeof upload.single);
console.log('=========================');

// Search products (public) - Đặt route search TRƯỚC các route có params
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    console.log('Search query:', q);
    
    if (!q) {
      return res.json({
        status: 'success',
        data: []
      });
    }

    const products = await Product.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    })
    .populate('category', 'name')
    .select('name price image description category')
    .limit(10);

    console.log('Search results:', products);

    const formattedProducts = products.map(product => ({
      _id: product._id,
      name: product.name,
      price: product.price,
      description: product.description,
      category: product.category?.name || 'Chưa phân loại',
      image: product.image?.url || null
    }));

    res.json({
      status: 'success',
      data: formattedProducts
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi tìm kiếm',
      error: err.message
    });
  }
});

// Get all products (public)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Đếm tổng số sản phẩm
    const total = await Product.countDocuments();

    // Lấy sản phẩm theo trang
    const products = await Product.find()
      .populate('category', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const productsWithFormat = products.map(product => ({
      _id: product._id,
      name: product.name,
      description: product.description,
      import_price: product.import_price,
      price: product.price,
      unit: product.unit,
      category: product.category || { status: 'No category assigned' },
      image: product.image.url ? {
        url: product.image.url,
        publicId: product.image.publicId
      } : { status: 'No image available' },
      createdAt: product.createdAt
    }));

    res.json({
      status: 'success',
      data: productsWithFormat,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Server Error'
    });
  }
});

// Add product (admin only)
router.post('/', auth, admin, upload.single('image'), async (req, res) => {
  try {
    console.log('=== Request Body ===');
    console.log(req.body);
    console.log('==================');

    const { name, price } = req.body;

    // Kiểm tra các trường bắt buộc
    const requiredFields = {
      name: name,
      price: price
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Thiếu thông tin bắt buộc',
        missingFields: missingFields,
        requiredFields: [
          'name (Tên sản phẩm)',
          'price (Giá bán)'
        ]
      });
    }

    // Validate giá trị
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Giá bán phải là số dương'
      });
    }

    // Kiểm tra category nếu được cung cấp
    if (req.body.category) {
      const categoryExists = await Category.findById(req.body.category);
      if (!categoryExists) {
        return res.status(400).json({
          status: 'error',
          message: 'ID danh mục không hợp lệ',
          tip: 'Vui lòng sử dụng API GET /categories để lấy danh sách ID danh mục hợp lệ'
        });
      }
    }

    // Tạo object product
    const productData = {
      name,
      description: req.body.description,
      price: Number(price),
      import_price: Number(req.body.import_price),
      category: req.body.category || null,
      unit: req.body.unit || 'Cái',
      image: {
        url: null,
        publicId: null
      }
    };

    console.log('=== Product Data ===');
    console.log(productData);
    console.log('===================');

    // Upload image to Cloudinary if provided
    if (req.file) {
      try {
        console.log('=== Image Upload Process ===');
        console.log('File details:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        });

        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        
        const uploadResult = await cloudinary.uploader.upload(dataURI, {
          folder: 'products',
          resource_type: 'auto',
          allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto' }
          ]
        });

        console.log('Cloudinary upload result:', uploadResult);

        productData.image = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        };
      } catch (uploadError) {
        console.error('=== Cloudinary Upload Error ===');
        console.error(uploadError);
        console.error('=============================');
        return res.status(400).json({
          status: 'error',
          message: 'Không thể tải lên hình ảnh',
          error: uploadError.message
        });
      }
    }

    // Save product to database
    const product = new Product(productData);
    await product.save();

    console.log('=== Saved Product ===');
    console.log(product);
    console.log('===================');

    // Get populated product data
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name');

    res.status(201).json({
      status: 'success',
      message: 'Thêm sản phẩm thành công',
      data: populatedProduct
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Tên sản phẩm đã tồn tại, vui lòng chọn tên khác'
      });
    }
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Update product route
router.put('/:id', auth, admin, upload.single('image'), async (req, res) => {
  try {
    // Tạo updateData object chỉ với các trường có giá trị
    const updateData = {};
    
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.import_price) updateData.import_price = req.body.import_price;
    if (req.body.price) updateData.price = req.body.price;
    if (req.body.unit) updateData.unit = req.body.unit;
    
    // Xử lý category đặc biệt
    if (req.body.category) {
      if (req.body.category === '') {
        updateData.category = null;
      } else {
        const categoryExists = await Category.findById(req.body.category);
        if (!categoryExists) {
          return res.status(400).json({
            status: 'error',
            message: 'ID danh mục không hợp lệ'
          });
        }
        updateData.category = req.body.category;
      }
    }

    // Xử lý upload ảnh mới nếu có
    if (req.file) {
      try {
        // Upload ảnh mới lên Cloudinary
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        
        const uploadResult = await cloudinary.uploader.upload(dataURI, {
          folder: 'products',
          resource_type: 'auto',
          allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto' }
          ]
        });

        // Xóa ảnh cũ trên Cloudinary nếu có
        const oldProduct = await Product.findById(req.params.id);
        if (oldProduct?.image?.publicId) {
          await cloudinary.uploader.destroy(oldProduct.image.publicId);
        }

        // Cập nhật thông tin ảnh mới
        updateData.image = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id
        };
      } catch (uploadError) {
        console.error('Cloudinary Upload Error:', uploadError);
        return res.status(400).json({
          status: 'error',
          message: 'Không thể tải lên hình ảnh mới',
          error: uploadError.message
        });
      }
    }

    console.log('Update Data:', updateData);

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('category');

    if (!updatedProduct) {
      return res.status(404).json({
        status: 'error',
        message: 'Không tìm thấy sản phẩm'
      });
    }

    res.json({
      status: 'success',
      data: updatedProduct
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name');
    
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        ...product._doc,
        category: product.category || { status: 'No category assigned' }
      }
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid product ID'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Server Error'
    });
  }
});

// Delete product (admin only)
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Product removed' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   GET api/products/test
// @desc    Test products availability
// @access  Public
router.get('/test', async (req, res) => {
  try {
    const products = await Product.find();
    if (products.length > 0) {
      res.json({
        status: 'success',
        message: 'Data available',
        count: products.length,
        data: products
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

// Import products from JSON (admin only)
router.post('/import', [auth, admin], async (req, res) => {
  try {
    const { products } = req.body;
    
    console.log('Received products data:', products); // Debug log

    // Kiểm tra dữ liệu đầu vào
    if (!Array.isArray(products)) {
      return res.status(400).json({
        status: 'error',
        message: 'Dữ liệu phải là một mảng các sản phẩm'
      });
    }

    // Validate từng sản phẩm
    const validProducts = products.filter(product => {
      const isValid = (
        product.name &&
        typeof product.name === 'string' &&
        product.price &&
        typeof product.price === 'number' &&
        product.description &&
        typeof product.description === 'string'
      );

      if (!isValid) {
        console.log('Invalid product:', product); // Debug log
      }

      return isValid;
    });

    if (validProducts.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Không có sản phẩm hợp lệ để import',
        format: {
          required: {
            name: 'string',
            price: 'number',
            description: 'string'
          },
          optional: {
            import_price: 'number',
            category: 'string (category ID)',
            image: {
              url: 'string',
              publicId: 'string'
            }
          }
        }
      });
    }

    // Import các sản phẩm hợp lệ
    const importedProducts = await Product.insertMany(validProducts);

    res.json({
      status: 'success',
      message: `Import thành công ${importedProducts.length} sản phẩm`,
      invalidCount: products.length - validProducts.length,
      importedProducts: importedProducts
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi import dữ liệu',
      error: err.message
    });
  }
});

// Danh sách đơn vị hợp lệ
const VALID_UNITS = [
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
  "Lon"
];

// Thêm route mới cho bulk import
router.post('/bulk', [auth, admin], async (req, res) => {
  try {
    const { products } = req.body;
    
    if (!Array.isArray(products)) {
      return res.status(400).json({
        status: 'error',
        message: 'Dữ liệu không đúng định dạng'
      });
    }

    const failedProducts = [];
    const successfulProducts = [];

    // Xử lý từng sản phẩm
    for (const product of products) {
      try {
        console.log('Đang xử lý sản phẩm:', product); // Log chi tiết sản phẩm đang xử lý

        // Validate sản phẩm
        if (!product.name) {
          failedProducts.push({
            ...product,
            error: 'Thiếu tên sản phẩm'
          });
          continue;
        }

        if (!product.price || product.price <= 0) {
          failedProducts.push({
            ...product,
            error: 'Giá không hợp lệ'
          });
          continue;
        }

        // Validate đơn vị
        if (product.unit && !VALID_UNITS.includes(product.unit)) {
          failedProducts.push({
            ...product,
            error: `Đơn vị "${product.unit}" không hợp lệ. Các đơn vị hợp lệ: ${VALID_UNITS.join(', ')}`
          });
          continue;
        }

        // Kiểm tra tên sản phẩm đã tồn tại
        const existingProduct = await Product.findOne({ 
          name: { $regex: new RegExp(`^${product.name}$`, 'i') } 
        });
        
        if (existingProduct) {
          failedProducts.push({
            ...product,
            error: 'Tên sản phẩm đã tồn tại'
          });
          continue;
        }

        // Chuẩn bị dữ liệu sản phẩm
        const productData = {
          name: product.name,
          price: product.price,
          unit: product.unit || 'Cái',
          description: product.description || product.name, // Mô tả mặc định là tên sản phẩm
          import_price: product.import_price || 0
        };

        console.log('Dữ liệu sản phẩm sẽ lưu:', productData); // Log dữ liệu trước khi lưu

        // Thêm sản phẩm mới
        const newProduct = new Product(productData);
        const savedProduct = await newProduct.save();
        
        console.log('Đã lưu sản phẩm:', savedProduct); // Log kết quả lưu
        
        successfulProducts.push(savedProduct);

      } catch (error) {
        console.error('Lỗi khi xử lý sản phẩm:', product.name, error); // Log lỗi chi tiết
        failedProducts.push({
          ...product,
          error: `Lỗi: ${error.message}`
        });
      }
    }

    // Tạo response với thông tin chi tiết
    const response = {
      status: failedProducts.length === 0 ? 'success' : 'partial',
      message: `Import hoàn tất: ${successfulProducts.length} thành công, ${failedProducts.length} thất bại`,
      successCount: successfulProducts.length,
      failedCount: failedProducts.length,
      data: successfulProducts
    };

    // Thêm danh sách sản phẩm lỗi nếu có
    if (failedProducts.length > 0) {
      response.failedProducts = failedProducts.map(p => ({
        name: p.name,
        price: p.price,
        unit: p.unit,
        error: p.error,
        originalIndex: p.originalIndex
      }));
    }

    // Log kết quả cuối cùng
    console.log('=== Kết quả import ===');
    console.log('Thành công:', successfulProducts.length);
    console.log('Thất bại:', failedProducts.length);
    if (failedProducts.length > 0) {
      console.log('Chi tiết sản phẩm thất bại:', failedProducts);
    }
    console.log('======================');

    const statusCode = failedProducts.length > 0 ? 207 : 201;
    res.status(statusCode).json(response);

  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi import',
      error: error.message
    });
  }
});

module.exports = router; 
