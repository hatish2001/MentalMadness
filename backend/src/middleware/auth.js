const jwt = require('jsonwebtoken');
const { query } = require('../db/connection');
const { AuthenticationError, AuthorizationError } = require('./errorHandler');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const userResult = await query(
      'SELECT id, email, company_id, is_admin, first_name, last_name FROM employees WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      throw new AuthenticationError('User not found or inactive');
    }

    // Attach user to request
    req.user = userResult.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AuthenticationError('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new AuthenticationError('Token expired'));
    } else {
      next(error);
    }
  }
};

// Check if user is admin
const requireAdmin = async (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return next(new AuthorizationError('Admin access required'));
  }
  next();
};

// Check if user belongs to company
const requireCompanyAccess = (paramName = 'companyId') => {
  return async (req, res, next) => {
    const companyId = req.params[paramName] || req.body.companyId;
    
    if (!companyId) {
      return next(new AuthorizationError('Company ID required'));
    }

    if (req.user.company_id !== companyId && !req.user.is_admin) {
      return next(new AuthorizationError('Access denied to this company'));
    }

    next();
  };
};

// Check if user can access employee data
const requireEmployeeAccess = async (req, res, next) => {
  const employeeId = req.params.employeeId || req.body.employeeId;
  
  if (!employeeId) {
    return next(new AuthorizationError('Employee ID required'));
  }

  // User can access their own data
  if (req.user.id === employeeId) {
    return next();
  }

  // Admins can access employee data if they share company
  if (req.user.is_admin) {
    const result = await query(
      'SELECT id FROM employees WHERE id = $1 AND company_id = $2',
      [employeeId, req.user.company_id]
    );

    if (result.rows.length > 0) {
      return next();
    }
  }

  next(new AuthorizationError('Access denied to employee data'));
};

// Optional authentication (for public endpoints that benefit from auth)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userResult = await query(
      'SELECT id, email, company_id, is_admin, first_name, last_name FROM employees WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (userResult.rows.length > 0) {
      req.user = userResult.rows[0];
    }
  } catch (error) {
    // Ignore errors for optional auth
    global.logger.debug('Optional auth failed:', error.message);
  }
  
  next();
};

// Generate JWT token
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Generate magic link token
const generateMagicLinkToken = () => {
  // Generate a secure random token
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return token;
};

module.exports = {
  authenticate,
  requireAdmin,
  requireCompanyAccess,
  requireEmployeeAccess,
  optionalAuth,
  generateToken,
  generateMagicLinkToken
};
