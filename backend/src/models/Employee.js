const { query } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class Employee {
  constructor(data) {
    this.id = data.id;
    this.companyId = data.company_id;
    this.email = data.email;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.department = data.department;
    this.role = data.role;
    this.managerId = data.manager_id;
    this.isAdmin = data.is_admin;
    this.isActive = data.is_active;
    this.dataSharingConsent = data.data_sharing_consent;
    this.pushNotificationToken = data.push_notification_token;
    this.notificationPreferences = data.notification_preferences || {};
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async create(employeeData) {
    const {
      companyId,
      email,
      firstName,
      lastName,
      department,
      role,
      managerId,
      isAdmin = false
    } = employeeData;

    const id = uuidv4();

    const result = await query(`
      INSERT INTO employees (
        id, company_id, email, first_name, last_name, 
        department, role, manager_id, is_admin
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [id, companyId, email.toLowerCase(), firstName, lastName, department, role, managerId, isAdmin]);

    return new Employee(result.rows[0]);
  }

  static async findById(id) {
    const result = await query('SELECT * FROM employees WHERE id = $1', [id]);
    return result.rows.length > 0 ? new Employee(result.rows[0]) : null;
  }

  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM employees WHERE email = $1', 
      [email.toLowerCase()]
    );
    return result.rows.length > 0 ? new Employee(result.rows[0]) : null;
  }

  static async findByCompany(companyId, options = {}) {
    let queryText = 'SELECT * FROM employees WHERE company_id = $1';
    const params = [companyId];

    if (options.activeOnly) {
      queryText += ' AND is_active = true';
    }

    if (options.department) {
      queryText += ` AND department = $${params.length + 1}`;
      params.push(options.department);
    }

    if (options.isAdmin !== undefined) {
      queryText += ` AND is_admin = $${params.length + 1}`;
      params.push(options.isAdmin);
    }

    queryText += ' ORDER BY last_name, first_name';

    const result = await query(queryText, params);
    return result.rows.map(row => new Employee(row));
  }

  async update(updates) {
    const allowedFields = [
      'first_name', 'last_name', 'department', 'role', 
      'manager_id', 'is_admin', 'is_active', 'data_sharing_consent',
      'push_notification_token', 'notification_preferences'
    ];

    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return this;

    values.push(this.id);
    const result = await query(
      `UPDATE employees SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    Object.assign(this, new Employee(result.rows[0]));
    return this;
  }

  async getCheckInStats(days = 30) {
    const result = await query(`
      SELECT 
        COUNT(*) as total_checkins,
        AVG(stress_level) as avg_stress,
        COUNT(DISTINCT DATE(created_at)) as unique_days,
        MAX(created_at) as last_checkin
      FROM checkins
      WHERE employee_id = $1
      AND created_at >= NOW() - INTERVAL '%s days'
    `, [this.id, days]);

    return result.rows[0];
  }

  async getRecentCheckIns(limit = 10) {
    const result = await query(`
      SELECT * FROM checkins
      WHERE employee_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [this.id, limit]);

    return result.rows;
  }

  async hasCheckedInToday() {
    const result = await query(`
      SELECT EXISTS(
        SELECT 1 FROM checkins 
        WHERE employee_id = $1 
        AND DATE(created_at) = CURRENT_DATE
      ) as checked_in
    `, [this.id]);

    return result.rows[0].checked_in;
  }

  async getManager() {
    if (!this.managerId) return null;
    return Employee.findById(this.managerId);
  }

  async getTeamMembers() {
    if (!this.isAdmin && !this.managerId) return [];
    
    const result = await query(
      'SELECT * FROM employees WHERE manager_id = $1 AND is_active = true',
      [this.id]
    );

    return result.rows.map(row => new Employee(row));
  }

  async setMagicLinkToken(token, expiresInMinutes = 15) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    await query(
      'UPDATE employees SET magic_link_token = $1, magic_link_expires_at = $2 WHERE id = $3',
      [token, expiresAt, this.id]
    );
  }

  async clearMagicLinkToken() {
    await query(
      'UPDATE employees SET magic_link_token = NULL, magic_link_expires_at = NULL WHERE id = $1',
      [this.id]
    );
  }

  async updateNotificationPreferences(preferences) {
    this.notificationPreferences = { ...this.notificationPreferences, ...preferences };
    await query(
      'UPDATE employees SET notification_preferences = $1 WHERE id = $2',
      [JSON.stringify(this.notificationPreferences), this.id]
    );
  }

  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  canViewEmployeeData(targetEmployeeId) {
    // Can view own data
    if (this.id === targetEmployeeId) return true;
    
    // Admins can view company employees with consent
    if (this.isAdmin) return true;
    
    // Managers can view their direct reports
    // This would require checking if target employee has this person as manager
    return false;
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.getFullName(),
      department: this.department,
      role: this.role,
      isAdmin: this.isAdmin,
      isActive: this.isActive,
      dataSharingConsent: this.dataSharingConsent,
      notificationPreferences: this.notificationPreferences,
      createdAt: this.createdAt
    };
  }
}

module.exports = Employee;
