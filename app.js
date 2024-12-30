const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
require('dotenv').config();
const fileUpload = require('express-fileupload');
const path = require('path');

const app = express();

// Connect Database
connectDB();

// Init Middleware
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers
  });
  next();
});

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(fileUpload());

// Define Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/customers', require('./routes/customers'));
// Đã xóa route invoice

// Thêm error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Log when routes are mounted
console.log('Available routes:', app._router.stack
  .filter(r => r.route)
  .map(r => ({
    path: r.route.path,
    methods: Object.keys(r.route.methods)
  }))
);

// Thêm middleware để log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log('Storage path:', path.join(__dirname, 'storage'));
});

module.exports = app; 