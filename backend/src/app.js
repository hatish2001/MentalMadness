const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const winston = require('winston');
const path = require('path');

// Load environment variables
dotenv.config();

// Import middleware
const { auditLog } = require('./middleware/logging');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const checkinRoutes = require('./routes/checkins');
const adminRoutes = require('./routes/admin');
const interventionRoutes = require('./routes/interventions');

// Initialize Express app
const app = express();

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: process.env.LOG_FILE || 'logs/mindcheck.log' 
    })
  ]
});

// Make logger globally available
global.logger = logger;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.WEB_APP_URL,
      process.env.MOBILE_APP_URL,
      'http://localhost:3001',
      'http://localhost:19000'
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Audit logging middleware for sensitive operations
app.use(auditLog);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/interventions', interventionRoutes);

// API documentation (basic info for MVP)
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'MindCheck API',
    version: '1.0.0',
    description: 'Mental health monitoring platform API',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'Send magic link',
        'POST /api/auth/verify': 'Verify magic link token'
      },
      checkins: {
        'POST /api/checkins': 'Create daily check-in',
        'GET /api/checkins/history': 'Get check-in history'
      },
      admin: {
        'GET /api/admin/dashboard': 'Get dashboard data',
        'GET /api/admin/alerts': 'Get flagged responses',
        'GET /api/admin/compliance-report': 'Generate compliance report'
      },
      interventions: {
        'GET /api/interventions': 'Get available interventions',
        'POST /api/interventions/:id/feedback': 'Submit intervention feedback'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource does not exist'
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`MindCheck backend server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
