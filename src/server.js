import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDynamoTables } from './config/initTables.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import customizerRoutes from './routes/customizerRoutes.js';
import wholesaleRoutes from './routes/wholesaleRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health Check & Cloud Architecture Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    brand: 'GIFTPocket Atelier',
    tagline: 'Little Things. Big Smiles. ♡',
    cloud: {
      provider: 'AWS',
      database: 'DynamoDB',
      storage: 'Amazon S3',
      region: process.env.AWS_REGION || 'ap-south-1 (Mumbai)'
    },
    currency: 'INR',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customizer', customizerRoutes);
app.use('/api/wholesale', wholesaleRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin', adminRoutes);

// Global 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.url}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error: ' + (err.message || 'Unknown error')
  });
});

// Initialize AWS DynamoDB Tables & Start Server
async function startServer() {
  await initDynamoTables();

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`✨ GIFTPocket Backend API Running with AWS Integration`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📍 AWS Region: ${process.env.AWS_REGION || 'ap-south-1 (Mumbai)'}`);
    console.log(`🗄️  Database: AWS DynamoDB`);
    console.log(`📦 Media Storage: AWS S3 (${process.env.AWS_S3_BUCKET || 'giftpocket-assets-mumbai'})`);
    console.log(`======================================================\n`);
  });
}

startServer();
