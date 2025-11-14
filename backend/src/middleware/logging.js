const { query } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

// HIPAA-compliant audit logging
const auditLog = async (req, res, next) => {
  // Skip logging for health checks and non-sensitive endpoints
  const skipPaths = ['/health', '/api/docs', '/favicon.ico'];
  if (skipPaths.some(path => req.path.includes(path))) {
    return next();
  }

  // Capture original send function
  const originalSend = res.send;
  
  // Override send function to log after response
  res.send = function(data) {
    res.locals.responseBody = data;
    originalSend.call(this, data);
  };

  // Log request details
  const auditEntry = {
    id: uuidv4(),
    userId: req.user?.id || null,
    userType: req.user ? 'employee' : 'anonymous',
    action: `${req.method} ${req.path}`,
    resourceType: determineResourceType(req.path),
    resourceId: extractResourceId(req),
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  };

  // Continue with request
  res.on('finish', async () => {
    try {
      // Add response status to audit
      auditEntry.success = res.statusCode >= 200 && res.statusCode < 400;
      auditEntry.statusCode = res.statusCode;
      
      // Log to database
      await logToDatabase(auditEntry);
    } catch (error) {
      global.logger.error('Failed to create audit log:', error);
    }
  });

  next();
};

// Determine resource type from path
function determineResourceType(path) {
  if (path.includes('/checkins')) return 'checkin';
  if (path.includes('/employees')) return 'employee';
  if (path.includes('/companies')) return 'company';
  if (path.includes('/interventions')) return 'intervention';
  if (path.includes('/admin')) return 'admin';
  if (path.includes('/auth')) return 'auth';
  return 'unknown';
}

// Extract resource ID from request
function extractResourceId(req) {
  // Try to get ID from params, query, or body
  return req.params.id || 
         req.query.id || 
         req.body?.id || 
         req.body?.checkinId || 
         req.body?.employeeId ||
         null;
}

// Log to database
async function logToDatabase(auditEntry) {
  const sql = `
    INSERT INTO audit_logs (
      id, user_id, user_type, action, resource_type, 
      resource_id, details, ip_address, user_agent, 
      success, error_message, timestamp
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `;
  
  const values = [
    auditEntry.id,
    auditEntry.userId,
    auditEntry.userType,
    auditEntry.action,
    auditEntry.resourceType,
    auditEntry.resourceId,
    JSON.stringify({ statusCode: auditEntry.statusCode }),
    auditEntry.ipAddress,
    auditEntry.userAgent,
    auditEntry.success,
    auditEntry.errorMessage || null,
    auditEntry.timestamp
  ];

  await query(sql, values);
}

// Log sensitive data access
async function logDataAccess(userId, action, resourceType, resourceId, details = {}) {
  try {
    const auditEntry = {
      id: uuidv4(),
      userId,
      userType: 'employee',
      action,
      resourceType,
      resourceId,
      details: JSON.stringify(details),
      timestamp: new Date().toISOString(),
      success: true
    };

    await logToDatabase(auditEntry);
  } catch (error) {
    global.logger.error('Failed to log data access:', error);
  }
}

// Log admin actions
async function logAdminAction(adminId, action, targetUserId, details = {}) {
  try {
    const auditEntry = {
      id: uuidv4(),
      userId: adminId,
      userType: 'admin',
      action: `ADMIN_${action}`,
      resourceType: 'employee',
      resourceId: targetUserId,
      details: JSON.stringify(details),
      timestamp: new Date().toISOString(),
      success: true
    };

    await logToDatabase(auditEntry);
  } catch (error) {
    global.logger.error('Failed to log admin action:', error);
  }
}

// Clean up old audit logs (run periodically)
async function cleanupAuditLogs(daysToKeep = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const sql = `
      DELETE FROM audit_logs 
      WHERE timestamp < $1 
      AND user_type != 'admin'
      RETURNING id
    `;

    const result = await query(sql, [cutoffDate.toISOString()]);
    
    global.logger.info(`Cleaned up ${result.rowCount} old audit logs`);
    
    return result.rowCount;
  } catch (error) {
    global.logger.error('Failed to cleanup audit logs:', error);
    throw error;
  }
}

module.exports = {
  auditLog,
  logDataAccess,
  logAdminAction,
  cleanupAuditLogs
};
