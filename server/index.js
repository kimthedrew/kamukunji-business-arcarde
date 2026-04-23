const express = require('express');
const cors = require('cors');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const pino = require('pino');
const pinoHttp = require('pino-http');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Logger — pino-pretty only in dev
const loggerOptions = {
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
};
if (process.env.NODE_ENV !== 'production') {
  try {
    require.resolve('pino-pretty');
    loggerOptions.transport = { target: 'pino-pretty' };
  } catch {}
}
const logger = pino(loggerOptions);

const authRoutes = require('./routes/auth');
const shopRoutes = require('./routes/shops');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const { router: notificationRoutes, sendNotificationToShop } = require('./routes/notifications');
const posRoutes = require('./routes/pos');
const analyticsRoutes = require('./routes/analytics');
const creditsRoutes = require('./routes/credits');
const staffRoutes = require('./routes/staff');
const mpesaRoutes = require('./routes/mpesa');
const smsRoutes = require('./routes/sms');
const reviewRoutes = require('./routes/reviews');
const customerRoutes = require('./routes/customers');

const app = express();
app.locals.logger = logger;
const PORT = process.env.PORT || 8000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disabled — React app handles CSP
  crossOriginEmbedderPolicy: false
}));
app.use(compression());

// HTTP request logging
app.use(pinoHttp({ logger, autoLogging: process.env.NODE_ENV !== 'test' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login attempts per 15 min
  message: { message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/admin/login', authLimiter);
app.use('/api/staff/login', authLimiter);
app.use('/api/customers/login', authLimiter);

// Middleware
app.use(cors({
  origin: true, // Permissive — restrict in production via CLIENT_URL env
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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
  // Serve static files from the React build with cache headers
  app.use(express.static(actualPublicPath, {
    maxAge: '1d', // Cache for 1 day
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      // Don't cache HTML files to ensure fresh content
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      // Cache JS and CSS files for 1 day
      else if (path.endsWith('.js') || path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  }));
  console.log('Static files will be served from:', actualPublicPath);
  
  // Add middleware to log static file requests
  app.use((req, res, next) => {
    if (req.path.startsWith('/static/') || 
        req.path.endsWith('.js') || 
        req.path.endsWith('.css') || 
        req.path.endsWith('.json') || 
        req.path.endsWith('.ico') || 
        req.path.endsWith('.png') || 
        req.path.endsWith('.jpg') || 
        req.path.endsWith('.jpeg') || 
        req.path.endsWith('.gif') || 
        req.path.endsWith('.svg') || 
        req.path.endsWith('.woff') || 
        req.path.endsWith('.woff2') || 
        req.path.endsWith('.ttf') || 
        req.path.endsWith('.eot')) {
      console.log(`Static file request: ${req.path}`);
    }
    next();
  });
}

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    port: PORT,
    staticFiles: actualPublicPath ? 'available' : 'not available'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes — must be registered before any catch-all
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/mpesa', mpesaRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/customers', customerRoutes);

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

// Serve React app or fallback — must come AFTER all API routes
if (actualPublicPath) {
  // Catch-all handler: send back React's index.html file for page routes only
  // This should come AFTER static file middleware to avoid intercepting static files
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    
    // Skip static file requests - these should be handled by express.static middleware
    if (req.path.startsWith('/static/') || 
        req.path.endsWith('.js') || 
        req.path.endsWith('.css') || 
        req.path.endsWith('.json') || 
        req.path.endsWith('.ico') || 
        req.path.endsWith('.png') || 
        req.path.endsWith('.jpg') || 
        req.path.endsWith('.jpeg') || 
        req.path.endsWith('.gif') || 
        req.path.endsWith('.svg') || 
        req.path.endsWith('.woff') || 
        req.path.endsWith('.woff2') || 
        req.path.endsWith('.ttf') || 
        req.path.endsWith('.eot')) {
      console.log(`Static file not found: ${req.path}`);
      return res.status(404).json({ message: 'Static file not found', path: req.path });
    }
    
    // Debug: log the request
    console.log(`Serving React app for route: ${req.path}`);
    
    const indexPath = path.join(actualPublicPath, 'index.html');
    console.log('Serving React app from:', indexPath);
    
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error('React app not found at:', indexPath);
      res.status(404).send('React app not found');
    }
  });
} else {
  // In development the React dev server handles the frontend.
  // Only catch non-API GET requests so unknown routes don't hang.
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.status(404).json({ message: 'Not found' });
    }
  });
}

// Global error handler — must come after all routes
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  logger.error({ err, req: { method: req.method, url: req.url } }, 'Unhandled error');
  res.status(status).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Static files served from: ${actualPublicPath || 'FALLBACK'}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌍 Server listening on 0.0.0.0:${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
