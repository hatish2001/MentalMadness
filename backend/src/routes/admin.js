const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { query, cache } = require('../db/connection');
const { logAdminAction } = require('../middleware/logging');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { sendWeeklySummary } = require('../services/emailService');
const { getCompanyInterventionStats, analyzeInterventionsByTrigger } = require('../services/interventionEngine');
const { analyzeEmployeeTrends } = require('../services/crisisDetection');

const router = express.Router();

// Admin dashboard overview
router.get('/dashboard',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const companyId = req.user.company_id;
    const { period = '7' } = req.query; // Default to 7 days
    
    // Check cache first
    const cacheKey = `company:${companyId}:dashboard:${period}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Get company health score and metrics
    const metricsResult = await query(`
      WITH recent_checkins AS (
        SELECT 
          c.*,
          e.department
        FROM checkins c
        JOIN employees e ON c.employee_id = e.id
        WHERE c.company_id = $1
        AND c.created_at >= NOW() - INTERVAL '${period} days'
      ),
      daily_stats AS (
        SELECT 
          DATE(created_at) as checkin_date,
          AVG(stress_level) as daily_avg_stress,
          COUNT(DISTINCT employee_id) as employees_checked_in
        FROM recent_checkins
        GROUP BY DATE(created_at)
      ),
      department_stats AS (
        SELECT 
          department,
          AVG(stress_level) as avg_stress,
          COUNT(DISTINCT employee_id) as active_employees,
          COUNT(*) as total_checkins
        FROM recent_checkins
        GROUP BY department
      ),
      trigger_counts AS (
        SELECT 
          stress_trigger,
          COUNT(*) as count,
          AVG(stress_level) as avg_stress_level
        FROM recent_checkins
        GROUP BY stress_trigger
      )
      SELECT 
        (SELECT AVG(stress_level) FROM recent_checkins) as avg_stress_level,
        (SELECT COUNT(DISTINCT employee_id) FROM recent_checkins) as active_employees,
        (SELECT COUNT(*) FROM recent_checkins) as total_checkins,
        (SELECT COUNT(*) FROM employees WHERE company_id = $1 AND is_active = true) as total_employees,
        (SELECT json_agg(row_to_json(daily_stats) ORDER BY checkin_date) FROM daily_stats) as daily_trends,
        (SELECT json_agg(row_to_json(department_stats) ORDER BY avg_stress DESC) FROM department_stats) as department_breakdown,
        (SELECT json_agg(row_to_json(trigger_counts) ORDER BY count DESC) FROM trigger_counts) as stress_triggers
    `, [companyId]);

    const metrics = metricsResult.rows[0];
    
    // Calculate health score (0-100)
    const avgStress = parseFloat(metrics.avg_stress_level) || 5;
    const completionRate = metrics.total_employees > 0 
      ? (metrics.active_employees / metrics.total_employees) 
      : 0;
    const healthScore = Math.round(
      ((10 - avgStress) * 7 + completionRate * 3) * 10
    );

    // Get trend direction
    const trends = metrics.daily_trends || [];
    let trend = { direction: 'stable', change: 0 };
    if (trends.length >= 2) {
      const recent = trends.slice(-3).reduce((sum, d) => sum + parseFloat(d.daily_avg_stress), 0) / 3;
      const previous = trends.slice(-6, -3).reduce((sum, d) => sum + parseFloat(d.daily_avg_stress), 0) / 3;
      const change = recent - previous;
      trend = {
        direction: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'stable',
        change: Math.round(change * 10) / 10
      };
    }

    // Get alerts count
    const alertsResult = await query(`
      SELECT COUNT(*) as count
      FROM flagged_responses
      WHERE company_id = $1
      AND admin_reviewed = false
      AND resolved = false
    `, [companyId]);

    const response = {
      companyHealthScore: healthScore,
      metrics: {
        averageStressLevel: Math.round(avgStress * 10) / 10,
        activeEmployees: parseInt(metrics.active_employees),
        totalEmployees: parseInt(metrics.total_employees),
        checkInCompletionRate: Math.round(completionRate * 100),
        totalCheckIns: parseInt(metrics.total_checkins),
        trend
      },
      dailyTrends: trends.map(t => ({
        date: t.checkin_date,
        averageStress: Math.round(t.daily_avg_stress * 10) / 10,
        completions: parseInt(t.employees_checked_in)
      })),
      departmentBreakdown: (metrics.department_breakdown || []).map(d => ({
        department: d.department || 'Unknown',
        averageStress: Math.round(d.avg_stress * 10) / 10,
        activeEmployees: parseInt(d.active_employees),
        totalCheckIns: parseInt(d.total_checkins)
      })),
      topStressors: (metrics.stress_triggers || []).slice(0, 5).map(t => ({
        trigger: t.stress_trigger,
        count: parseInt(t.count),
        averageStressLevel: Math.round(t.avg_stress_level * 10) / 10,
        percentage: Math.round((parseInt(t.count) / parseInt(metrics.total_checkins)) * 100)
      })),
      alerts: {
        unreviewed: parseInt(alertsResult.rows[0].count)
      }
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, response, 300);

    // Log admin access
    await logAdminAction(req.user.id, 'VIEW_DASHBOARD', null, { period });

    res.json(response);
  })
);

// Get heat map data by department/team
router.get('/heatmap',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const companyId = req.user.company_id;
    const { groupBy = 'department', period = '7' } = req.query;

    const result = await query(`
      WITH recent_data AS (
        SELECT 
          c.stress_level,
          c.stress_trigger,
          c.created_at,
          e.${groupBy === 'department' ? 'department' : 'role'} as group_name,
          e.id as employee_id
        FROM checkins c
        JOIN employees e ON c.employee_id = e.id
        WHERE c.company_id = $1
        AND c.created_at >= NOW() - INTERVAL '${period} days'
      ),
      group_stats AS (
        SELECT 
          COALESCE(group_name, 'Unassigned') as name,
          AVG(stress_level) as avg_stress,
          COUNT(DISTINCT employee_id) as employee_count,
          COUNT(*) as checkin_count,
          STDDEV(stress_level) as stress_variance,
          MODE() WITHIN GROUP (ORDER BY stress_trigger) as top_trigger
        FROM recent_data
        GROUP BY group_name
      ),
      historical_comparison AS (
        SELECT 
          COALESCE(e.${groupBy === 'department' ? 'department' : 'role'}, 'Unassigned') as name,
          AVG(c.stress_level) as prev_avg_stress
        FROM checkins c
        JOIN employees e ON c.employee_id = e.id
        WHERE c.company_id = $1
        AND c.created_at >= NOW() - INTERVAL '${period * 2} days'
        AND c.created_at < NOW() - INTERVAL '${period} days'
        GROUP BY e.${groupBy === 'department' ? 'department' : 'role'}
      )
      SELECT 
        gs.*,
        hc.prev_avg_stress,
        CASE 
          WHEN gs.avg_stress >= 8 THEN 'critical'
          WHEN gs.avg_stress >= 6 THEN 'elevated'
          WHEN gs.avg_stress >= 4 THEN 'moderate'
          ELSE 'healthy'
        END as status,
        ROUND((gs.avg_stress - COALESCE(hc.prev_avg_stress, gs.avg_stress)) * 100) / 100 as change
      FROM group_stats gs
      LEFT JOIN historical_comparison hc ON gs.name = hc.name
      ORDER BY gs.avg_stress DESC
    `, [companyId]);

    const heatmapData = result.rows.map(row => ({
      name: row.name,
      averageStress: Math.round(row.avg_stress * 10) / 10,
      employeeCount: parseInt(row.employee_count),
      checkinCount: parseInt(row.checkin_count),
      variance: Math.round(row.stress_variance * 10) / 10,
      topTrigger: row.top_trigger,
      status: row.status,
      change: parseFloat(row.change),
      trend: row.change > 0.5 ? 'increasing' : row.change < -0.5 ? 'decreasing' : 'stable'
    }));

    res.json({
      groupBy,
      period: parseInt(period),
      data: heatmapData
    });
  })
);

// Get flagged responses and alerts
router.get('/alerts',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const companyId = req.user.company_id;
    const { status = 'unresolved', severity, limit = 50, offset = 0 } = req.query;

    let queryText = `
      SELECT 
        fr.*,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        c.stress_level,
        c.stress_trigger,
        c.created_at as checkin_time,
        admin.first_name as admin_first_name,
        admin.last_name as admin_last_name
      FROM flagged_responses fr
      JOIN employees e ON fr.employee_id = e.id
      JOIN checkins c ON fr.checkin_id = c.id
      LEFT JOIN employees admin ON fr.admin_id = admin.id
      WHERE fr.company_id = $1
    `;

    const params = [companyId];

    if (status === 'unresolved') {
      queryText += ' AND fr.resolved = false';
    } else if (status === 'resolved') {
      queryText += ' AND fr.resolved = true';
    }

    if (severity) {
      queryText += ` AND fr.severity = $${params.length + 1}`;
      params.push(severity);
    }

    queryText += ' ORDER BY fr.flagged_at DESC LIMIT $2 OFFSET $3';
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM flagged_responses 
      WHERE company_id = $1
    `;
    const countParams = [companyId];

    if (status === 'unresolved') {
      countQuery += ' AND resolved = false';
    } else if (status === 'resolved') {
      countQuery += ' AND resolved = true';
    }

    if (severity) {
      countQuery += ' AND severity = $2';
      countParams.push(severity);
    }

    const countResult = await query(countQuery, countParams);

    const alerts = result.rows.map(row => ({
      id: row.id,
      employee: {
        id: row.employee_id,
        name: `${row.first_name} ${row.last_name}`,
        email: row.email,
        department: row.department
      },
      flaggedAt: row.flagged_at,
      reason: row.flag_reason,
      severity: row.severity,
      triggerWords: row.trigger_words,
      checkin: {
        stressLevel: row.stress_level,
        stressTrigger: row.stress_trigger,
        time: row.checkin_time
      },
      status: {
        reviewed: row.admin_reviewed,
        resolved: row.resolved,
        reviewedBy: row.admin_first_name ? `${row.admin_first_name} ${row.admin_last_name}` : null,
        action: row.admin_action,
        notes: row.admin_notes,
        resolvedAt: row.resolved_at
      }
    }));

    // Log admin action
    await logAdminAction(req.user.id, 'VIEW_ALERTS', null, { status, severity });

    res.json({
      alerts,
      total: parseInt(countResult.rows[0].count),
      filters: { status, severity }
    });
  })
);

// Update flagged response status
router.put('/alerts/:alertId',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    const { action, notes, resolved } = req.body;
    const adminId = req.user.id;
    const companyId = req.user.company_id;

    // Verify alert belongs to company
    const alertResult = await query(
      'SELECT employee_id FROM flagged_responses WHERE id = $1 AND company_id = $2',
      [alertId, companyId]
    );

    if (alertResult.rows.length === 0) {
      throw new NotFoundError('Alert not found');
    }

    const employeeId = alertResult.rows[0].employee_id;

    // Update alert
    await query(`
      UPDATE flagged_responses
      SET 
        admin_reviewed = true,
        admin_id = $1,
        admin_action = $2,
        admin_notes = $3,
        resolved = $4,
        resolved_at = CASE WHEN $4 = true THEN NOW() ELSE NULL END
      WHERE id = $5
    `, [adminId, action, notes, resolved, alertId]);

    // Log admin action
    await logAdminAction(adminId, 'UPDATE_ALERT', employeeId, { alertId, action, resolved });

    // Invalidate cache
    await cache.invalidatePattern(`company:${companyId}:*`);

    res.json({ message: 'Alert updated successfully' });
  })
);

// Get intervention effectiveness report
router.get('/interventions/effectiveness',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const companyId = req.user.company_id;
    const { period = '30' } = req.query;

    // Get company-wide intervention statistics
    const stats = await getCompanyInterventionStats(companyId, parseInt(period));
    
    // Analyze by trigger
    const triggerAnalysis = await analyzeInterventionsByTrigger(companyId);

    res.json({
      period: parseInt(period),
      interventions: stats,
      byTrigger: triggerAnalysis,
      summary: {
        mostUsed: stats[0]?.name || null,
        mostEffective: stats
          .filter(s => s.times_clicked >= 5) // Minimum sample size
          .sort((a, b) => b.helpful_rate - a.helpful_rate)[0]?.name || null,
        averageClickRate: Math.round(
          stats.reduce((sum, s) => sum + (s.click_rate || 0), 0) / stats.length
        ),
        averageHelpfulRate: Math.round(
          stats
            .filter(s => s.times_clicked > 0)
            .reduce((sum, s) => sum + (s.helpful_rate || 0), 0) / 
          stats.filter(s => s.times_clicked > 0).length
        )
      }
    });
  })
);

// Get compliance report
router.get('/compliance-report',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const companyId = req.user.company_id;
    const { startDate, endDate } = req.query;
    
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDate || new Date().toISOString();

    const result = await query(`
      WITH compliance_data AS (
        SELECT 
          e.id,
          e.first_name,
          e.last_name,
          e.department,
          COUNT(c.id) as checkins_completed,
          EXTRACT(EPOCH FROM ($2::timestamp - $1::timestamp)) / 86400 as total_days,
          COUNT(DISTINCT DATE(c.created_at)) as unique_days
        FROM employees e
        LEFT JOIN checkins c ON e.id = c.employee_id 
          AND c.created_at BETWEEN $1 AND $2
        WHERE e.company_id = $3
        AND e.is_active = true
        GROUP BY e.id
      ),
      department_summary AS (
        SELECT 
          department,
          AVG(checkins_completed::float / GREATEST(total_days, 1)) * 100 as avg_completion_rate,
          COUNT(*) as employee_count
        FROM compliance_data
        GROUP BY department
      ),
      stress_reduction AS (
        SELECT 
          AVG(CASE 
            WHEN week_num = 1 THEN avg_stress 
          END) as week_1_stress,
          AVG(CASE 
            WHEN week_num = 4 THEN avg_stress 
          END) as week_4_stress
        FROM (
          SELECT 
            EXTRACT(WEEK FROM c.created_at - $1::timestamp) + 1 as week_num,
            AVG(c.stress_level) as avg_stress
          FROM checkins c
          WHERE c.company_id = $3
          AND c.created_at BETWEEN $1 AND $2
          GROUP BY week_num
        ) weekly_stats
      )
      SELECT 
        (SELECT COUNT(*) FROM compliance_data WHERE checkins_completed > 0) as active_users,
        (SELECT COUNT(*) FROM compliance_data) as total_users,
        (SELECT AVG(checkins_completed::float / GREATEST(total_days, 1)) * 100 FROM compliance_data) as overall_completion_rate,
        (SELECT json_agg(row_to_json(department_summary) ORDER BY avg_completion_rate DESC) FROM department_summary) as department_compliance,
        (SELECT week_1_stress FROM stress_reduction) as initial_stress,
        (SELECT week_4_stress FROM stress_reduction) as final_stress,
        (SELECT COUNT(*) FROM checkins WHERE company_id = $3 AND created_at BETWEEN $1 AND $2) as total_checkins,
        (SELECT COUNT(*) FROM flagged_responses WHERE company_id = $3 AND flagged_at BETWEEN $1 AND $2) as total_alerts,
        (SELECT COUNT(*) FROM flagged_responses WHERE company_id = $3 AND resolved = true AND resolved_at BETWEEN $1 AND $2) as resolved_alerts
    `, [start, end, companyId]);

    const data = result.rows[0];
    const stressReduction = data.initial_stress && data.final_stress
      ? ((data.initial_stress - data.final_stress) / data.initial_stress) * 100
      : 0;

    // Log admin action
    await logAdminAction(req.user.id, 'GENERATE_COMPLIANCE_REPORT', null, { startDate: start, endDate: end });

    res.json({
      report: {
        period: {
          start,
          end
        },
        participation: {
          activeUsers: parseInt(data.active_users),
          totalUsers: parseInt(data.total_users),
          participationRate: Math.round((data.active_users / data.total_users) * 100),
          overallCompletionRate: Math.round(data.overall_completion_rate)
        },
        outcomes: {
          initialAverageStress: data.initial_stress ? Math.round(data.initial_stress * 10) / 10 : null,
          finalAverageStress: data.final_stress ? Math.round(data.final_stress * 10) / 10 : null,
          stressReductionPercentage: Math.round(stressReduction),
          totalCheckIns: parseInt(data.total_checkins)
        },
        safety: {
          totalAlerts: parseInt(data.total_alerts),
          resolvedAlerts: parseInt(data.resolved_alerts),
          resolutionRate: data.total_alerts > 0 
            ? Math.round((data.resolved_alerts / data.total_alerts) * 100)
            : 100
        },
        departmentBreakdown: (data.department_compliance || []).map(d => ({
          department: d.department || 'Unassigned',
          completionRate: Math.round(d.avg_completion_rate),
          employeeCount: d.employee_count
        }))
      },
      exportUrl: `/api/admin/compliance-report/export?start=${start}&end=${end}`
    });
  })
);

// Get employee details (with proper privacy controls)
router.get('/employees/:employeeId',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const companyId = req.user.company_id;

    // Verify employee belongs to company
    const employeeResult = await query(`
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.role,
        e.data_sharing_consent,
        e.created_at,
        manager.first_name as manager_first_name,
        manager.last_name as manager_last_name
      FROM employees e
      LEFT JOIN employees manager ON e.manager_id = manager.id
      WHERE e.id = $1 AND e.company_id = $2
    `, [employeeId, companyId]);

    if (employeeResult.rows.length === 0) {
      throw new NotFoundError('Employee not found');
    }

    const employee = employeeResult.rows[0];

    // Check if admin can view individual data
    if (!employee.data_sharing_consent) {
      return res.json({
        employee: {
          id: employee.id,
          name: `${employee.first_name} ${employee.last_name}`,
          department: employee.department,
          role: employee.role,
          manager: employee.manager_first_name 
            ? `${employee.manager_first_name} ${employee.manager_last_name}`
            : null
        },
        message: 'Detailed data not available - employee has not consented to data sharing',
        dataAvailable: false
      });
    }

    // Get recent trends
    const trends = await analyzeEmployeeTrends(employeeId);

    // Get recent check-ins
    const checkinsResult = await query(`
      SELECT 
        stress_level,
        stress_trigger,
        intervention_shown,
        created_at
      FROM checkins
      WHERE employee_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [employeeId]);

    // Log admin access to individual data
    await logAdminAction(req.user.id, 'VIEW_EMPLOYEE_DATA', employeeId);

    res.json({
      employee: {
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
        department: employee.department,
        role: employee.role,
        manager: employee.manager_first_name 
          ? `${employee.manager_first_name} ${employee.manager_last_name}`
          : null,
        joinedAt: employee.created_at
      },
      dataAvailable: true,
      trends,
      recentCheckIns: checkinsResult.rows
    });
  })
);

// Send test weekly summary
router.post('/send-weekly-summary',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const companyId = req.user.company_id;
    
    // This would typically be scheduled, but allowing manual trigger for MVP
    const summaryData = await generateWeeklySummary(companyId);
    
    await sendWeeklySummary(
      req.user.email,
      summaryData.companyName,
      summaryData
    );

    res.json({ message: 'Weekly summary sent to your email' });
  })
);

// Helper function to generate weekly summary
async function generateWeeklySummary(companyId) {
  const result = await query(`
    WITH weekly_data AS (
      SELECT 
        c.stress_level,
        c.stress_trigger,
        c.intervention_shown,
        i.type as intervention_type,
        if.helpful
      FROM checkins c
      LEFT JOIN interventions i ON c.intervention_shown = i.name
      LEFT JOIN intervention_feedback if ON c.id = if.checkin_id
      WHERE c.company_id = $1
      AND c.created_at >= NOW() - INTERVAL '7 days'
    ),
    previous_week AS (
      SELECT AVG(stress_level) as avg_stress
      FROM checkins
      WHERE company_id = $1
      AND created_at >= NOW() - INTERVAL '14 days'
      AND created_at < NOW() - INTERVAL '7 days'
    )
    SELECT 
      (SELECT name FROM companies WHERE id = $1) as company_name,
      (SELECT AVG(stress_level) FROM weekly_data) as avg_stress,
      (SELECT avg_stress FROM previous_week) as prev_avg_stress,
      (SELECT COUNT(DISTINCT employee_id) FROM checkins WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '7 days') as active_employees,
      (SELECT COUNT(*) FROM employees WHERE company_id = $1 AND is_active = true) as total_employees,
      (SELECT json_agg(triggers) FROM (
        SELECT stress_trigger as name, COUNT(*) * 100.0 / (SELECT COUNT(*) FROM weekly_data) as percentage
        FROM weekly_data
        GROUP BY stress_trigger
        ORDER BY COUNT(*) DESC
        LIMIT 3
      ) triggers) as top_triggers,
      (SELECT json_agg(interventions) FROM (
        SELECT 
          intervention_shown as name,
          COUNT(CASE WHEN helpful = true THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN helpful IS NOT NULL THEN 1 END), 0) as effectiveness
        FROM weekly_data
        WHERE intervention_shown IS NOT NULL
        GROUP BY intervention_shown
        ORDER BY effectiveness DESC NULLS LAST
        LIMIT 3
      ) interventions) as top_interventions
  `, [companyId]);

  const data = result.rows[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  return {
    companyName: data.company_name,
    weekRange: `${weekStart.toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
    avgStressLevel: Math.round(data.avg_stress * 10) / 10,
    stressTrend: data.avg_stress < data.prev_avg_stress 
      ? `↓ Down ${Math.round((data.prev_avg_stress - data.avg_stress) * 10) / 10} points from last week`
      : `↑ Up ${Math.round((data.avg_stress - data.prev_avg_stress) * 10) / 10} points from last week`,
    completionRate: Math.round((data.active_employees / data.total_employees) * 100),
    topTriggers: data.top_triggers || [],
    topInterventions: data.top_interventions || []
  };
}

module.exports = router;
