const express = require('express');
const cors = require('cors');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shops');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const { router: notificationRoutes, sendNotificationToShop } = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 8000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// Serve static files from public directory
const publicPath = path.join(__dirname, 'public');
console.log('Serving static files from:', publicPath);
console.log('Public directory exists:', require('fs').existsSync(publicPath));
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

// Check if public directory exists
let actualPublicPath = publicPath;
if (!require('fs').existsSync(publicPath)) {
  console.log('Public directory not found, checking alternative paths...');
  const altPaths = [
    path.join(process.cwd(), 'public'),
    path.join(__dirname, '..', 'public'),
    path.join(process.cwd(), 'server', 'public'),
    path.join('/app', 'server', 'public')
  ];
  
  for (const altPath of altPaths) {
    console.log('Checking:', altPath, 'exists:', require('fs').existsSync(altPath));
    if (require('fs').existsSync(altPath)) {
      actualPublicPath = altPath;
      console.log('Found public directory at:', actualPublicPath);
      break;
    }
  }
  
  // If still not found, create a fallback response
  if (!require('fs').existsSync(actualPublicPath)) {
    console.log('No public directory found anywhere. Creating fallback response.');
    actualPublicPath = null;
  }
}

if (actualPublicPath) {
  app.use(express.static(actualPublicPath));
} else {
  // Fallback: serve a simple HTML page if no public directory exists
  app.get('*', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>KBA - Under Maintenance</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            .error { color: #e74c3c; }
            .info { color: #3498db; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">Application Under Maintenance</h1>
            <p>The frontend files are not available. Please check the deployment logs.</p>
            <div class="info">
              <p>API endpoints are working:</p>
              <p><a href="/api/health">Health Check</a></p>
            </div>
          </div>
        </body>
      </html>
    `);
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Cloudinary upload route
app.post('/api/upload', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ message: 'No image provided' });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: 'kba-products',
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
      transformation: [
        { width: 800, height: 800, crop: 'limit' }, // Resize large images
        { quality: 'auto:good' } // Optimize quality
      ],
      chunk_size: 6000000 // Allow larger chunks for big images
    });

    res.json({
      message: 'Image uploaded successfully',
      publicId: result.public_id,
      imageUrl: result.secure_url
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
});

// Serve React app (only if we have a public directory)
if (actualPublicPath) {
  app.get('*', (req, res) => {
    const indexPath = path.join(actualPublicPath, 'index.html');
    console.log('Serving React app from:', indexPath);
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('React app not found');
    }
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
