const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../db/connection');
const { sendMagicLink } = require('../services/emailService');
const { generateToken, generateMagicLinkToken } = require('../middleware/auth');
const { ValidationError, AuthenticationError, NotFoundError } = require('../middleware/errorHandler');
const { logDataAccess } = require('../middleware/logging');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Request magic link
router.post('/login', 
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required')
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { email } = req.body;

    // Check if employee exists
    const employeeResult = await query(
      'SELECT id, first_name, company_id FROM employees WHERE email = $1 AND is_active = true',
      [email]
    );

    if (employeeResult.rows.length === 0) {
      // Don't reveal if email exists for security
      return res.json({
        message: 'If your email is registered, you will receive a login link shortly.'
      });
    }

    const employee = employeeResult.rows[0];

    // Generate magic link token
    const magicToken = generateMagicLinkToken();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes expiry

    // Save token to database
    await query(
      'UPDATE employees SET magic_link_token = $1, magic_link_expires_at = $2 WHERE id = $3',
      [magicToken, expiresAt, employee.id]
    );

    // Send magic link email
    const loginUrl = `${process.env.WEB_APP_URL}/auth/verify?token=${magicToken}`;
    await sendMagicLink(email, employee.first_name, loginUrl);

    // Log authentication attempt
    await logDataAccess(employee.id, 'LOGIN_REQUEST', 'auth', employee.id);

    res.json({
      message: 'If your email is registered, you will receive a login link shortly.'
    });
  })
);

// Verify magic link token
router.post('/verify',
  [
    body('token').notEmpty().withMessage('Token required')
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { token } = req.body;

    // Find employee with valid token
    const employeeResult = await query(`
      SELECT id, email, first_name, last_name, company_id, is_admin 
      FROM employees 
      WHERE magic_link_token = $1 
      AND magic_link_expires_at > NOW() 
      AND is_active = true
    `, [token]);

    if (employeeResult.rows.length === 0) {
      throw new AuthenticationError('Invalid or expired token');
    }

    const employee = employeeResult.rows[0];

    // Clear the magic link token
    await query(
      'UPDATE employees SET magic_link_token = NULL, magic_link_expires_at = NULL WHERE id = $1',
      [employee.id]
    );

    // Generate JWT token
    const jwtToken = generateToken(employee.id, employee.email);

    // Get company info
    const companyResult = await query(
      'SELECT name, subscription_tier FROM companies WHERE id = $1',
      [employee.company_id]
    );

    // Log successful login
    await logDataAccess(employee.id, 'LOGIN_SUCCESS', 'auth', employee.id);

    res.json({
      token: jwtToken,
      user: {
        id: employee.id,
        email: employee.email,
        firstName: employee.first_name,
        lastName: employee.last_name,
        isAdmin: employee.is_admin,
        company: {
          id: employee.company_id,
          name: companyResult.rows[0]?.name,
          tier: companyResult.rows[0]?.subscription_tier
        }
      }
    });
  })
);

// Refresh token endpoint (optional for better UX)
router.post('/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new ValidationError('Refresh token required');
    }

    // In a production app, you'd verify the refresh token from a database
    // For MVP, we'll just check if it's a valid JWT
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      
      // Generate new access token
      const newToken = generateToken(decoded.userId, decoded.email);
      
      res.json({ token: newToken });
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }
  })
);

// Logout endpoint (optional - mainly for audit trail)
router.post('/logout',
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    
    if (userId) {
      // Log logout action
      await logDataAccess(userId, 'LOGOUT', 'auth', userId);
    }

    res.json({ message: 'Logged out successfully' });
  })
);

// Request password reset (for future use when we add password auth)
router.post('/forgot-password',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required')
  ],
  asyncHandler(async (req, res) => {
    // For MVP, just return success message
    res.json({
      message: 'Password reset functionality coming soon. Please use magic link login.'
    });
  })
);

module.exports = router;
