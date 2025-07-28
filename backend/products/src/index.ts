import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import healthRoutes from './routes/health';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
initializeApp();
export const db = getFirestore();

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check (no auth required)
app.use('/health', healthRoutes);

// Authentication middleware for protected routes
app.use('/api', authMiddleware);

// API routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    }
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Products service started on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

export default app;