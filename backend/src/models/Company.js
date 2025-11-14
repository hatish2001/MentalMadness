const { query } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

class Company {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.industry = data.industry;
    this.employeeCount = data.employee_count;
    this.subscriptionTier = data.subscription_tier;
    this.settings = data.settings || {};
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  static async create(companyData) {
    const { name, industry, employeeCount, subscriptionTier = 'starter' } = companyData;
    
    const result = await query(`
      INSERT INTO companies (id, name, industry, employee_count, subscription_tier)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [uuidv4(), name, industry, employeeCount, subscriptionTier]);

    return new Company(result.rows[0]);
  }

  static async findById(id) {
    const result = await query('SELECT * FROM companies WHERE id = $1', [id]);
    return result.rows.length > 0 ? new Company(result.rows[0]) : null;
  }

  static async findByName(name) {
    const result = await query('SELECT * FROM companies WHERE name = $1', [name]);
    return result.rows.length > 0 ? new Company(result.rows[0]) : null;
  }

  async update(updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (['name', 'industry', 'employee_count', 'subscription_tier', 'settings'].includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return this;

    values.push(this.id);
    const result = await query(
      `UPDATE companies SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    Object.assign(this, new Company(result.rows[0]));
    return this;
  }

  async getEmployeeCount() {
    const result = await query(
      'SELECT COUNT(*) FROM employees WHERE company_id = $1 AND is_active = true',
      [this.id]
    );
    return parseInt(result.rows[0].count);
  }

  async getHealthMetrics(days = 7) {
    const result = await query(`
      SELECT 
        AVG(stress_level) as avg_stress,
        COUNT(DISTINCT employee_id) as active_employees,
        COUNT(*) as total_checkins
      FROM checkins
      WHERE company_id = $1
      AND created_at >= NOW() - INTERVAL '%s days'
    `, [this.id, days]);

    return result.rows[0];
  }

  async getDepartments() {
    const result = await query(`
      SELECT DISTINCT department 
      FROM employees 
      WHERE company_id = $1 
      AND department IS NOT NULL
      ORDER BY department
    `, [this.id]);

    return result.rows.map(row => row.department);
  }

  static validateTier(tier) {
    return ['starter', 'pro', 'enterprise'].includes(tier);
  }

  canAccessFeature(feature) {
    const tierFeatures = {
      starter: ['basic_dashboard', 'checkins', 'basic_interventions'],
      pro: ['basic_dashboard', 'checkins', 'basic_interventions', 'advanced_analytics', 'department_views'],
      enterprise: ['basic_dashboard', 'checkins', 'basic_interventions', 'advanced_analytics', 'department_views', 'individual_data', 'api_access', 'custom_interventions']
    };

    return tierFeatures[this.subscriptionTier]?.includes(feature) || false;
  }
}

module.exports = Company;
