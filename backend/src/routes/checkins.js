const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { logDataAccess } = require('../middleware/logging');
const { detectCrisis } = require('../services/crisisDetection');
const { recommendIntervention } = require('../services/interventionEngine');
const { cache } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Create daily check-in
router.post('/',
  authenticate,
  [
    body('stress_level').isInt({ min: 1, max: 10 }).withMessage('Stress level must be between 1-10'),
    body('stress_trigger').isIn(['workload', 'meetings', 'team_conflict', 'unclear_goals', 'personal', 'other']).withMessage('Invalid stress trigger'),
    body('previous_helper').optional().isString(),
    body('stress_trigger_details').optional().isString().isLength({ max: 500 })
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { stress_level, stress_trigger, previous_helper, stress_trigger_details } = req.body;
    const userId = req.user.id;
    const companyId = req.user.company_id;

    // Check if user already submitted today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const existingCheckin = await query(
      'SELECT id FROM checkins WHERE employee_id = $1 AND created_at >= $2',
      [userId, todayStart]
    );

    if (existingCheckin.rows.length > 0) {
      throw new ValidationError('You have already submitted a check-in today');
    }

    let checkinId;
    let flaggedResponseId = null;

    await transaction(async (client) => {
      // Create check-in
      const checkinResult = await client.query(`
        INSERT INTO checkins (
          id, employee_id, company_id, stress_level, 
          stress_trigger, previous_helper, stress_trigger_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        uuidv4(), userId, companyId, stress_level,
        stress_trigger, previous_helper, stress_trigger_details
      ]);

      checkinId = checkinResult.rows[0].id;

      // Check for crisis indicators
      if (stress_trigger_details) {
        const crisisCheck = await detectCrisis(stress_trigger_details, stress_level);
        if (crisisCheck.isCrisis) {
          // Create flagged response
          const flagResult = await client.query(`
            INSERT INTO flagged_responses (
              id, checkin_id, employee_id, company_id,
              flag_reason, severity, trigger_words
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `, [
            uuidv4(), checkinId, userId, companyId,
            crisisCheck.reason, crisisCheck.severity, crisisCheck.triggerWords
          ]);

          flaggedResponseId = flagResult.rows[0].id;

          // Notify admins immediately
          const adminResult = await client.query(
            'SELECT email, first_name FROM employees WHERE company_id = $1 AND is_admin = true',
            [companyId]
          );

          // Queue crisis alerts (in production, use a job queue)
          for (const admin of adminResult.rows) {
            global.logger.warn('Crisis detected', {
              employeeId: userId,
              adminEmail: admin.email,
              severity: crisisCheck.severity
            });
          }
        }
      }

      // Get intervention recommendation
      const intervention = await recommendIntervention(stress_level, stress_trigger, previous_helper);
      
      if (intervention) {
        // Update check-in with intervention
        await client.query(
          'UPDATE checkins SET intervention_shown = $1 WHERE id = $2',
          [intervention.name, checkinId]
        );
      }

      // Log data access
      await logDataAccess(userId, 'CREATE_CHECKIN', 'checkin', checkinId);

      // Invalidate relevant caches
      await cache.invalidatePattern(`company:${companyId}:*`);
      await cache.invalidatePattern(`employee:${userId}:*`);

      // Return response
      res.status(201).json({
        id: checkinId,
        message: 'Check-in submitted successfully',
        intervention: intervention ? {
          id: intervention.id,
          name: intervention.name,
          type: intervention.type,
          content: intervention.content,
          duration: intervention.duration_minutes
        } : null,
        flagged: !!flaggedResponseId
      });
    });
  })
);

// Get check-in history
router.get('/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 30;
    const offset = parseInt(req.query.offset) || 0;

    // Check cache first
    const cacheKey = `employee:${userId}:history:${limit}:${offset}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Query check-ins
    const checkinsResult = await query(`
      SELECT 
        c.id,
        c.stress_level,
        c.stress_trigger,
        c.previous_helper,
        c.intervention_shown,
        c.intervention_clicked,
        c.created_at,
        i.name as intervention_name,
        i.type as intervention_type
      FROM checkins c
      LEFT JOIN interventions i ON c.intervention_shown = i.name
      WHERE c.employee_id = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM checkins WHERE employee_id = $1',
      [userId]
    );

    // Calculate statistics
    const statsResult = await query(`
      SELECT 
        AVG(stress_level) as avg_stress,
        COUNT(*) as total_checkins,
        COUNT(DISTINCT DATE(created_at)) as days_tracked
      FROM checkins 
      WHERE employee_id = $1 
      AND created_at >= NOW() - INTERVAL '30 days'
    `, [userId]);

    const response = {
      checkins: checkinsResult.rows,
      total: parseInt(countResult.rows[0].count),
      stats: {
        averageStress: parseFloat(statsResult.rows[0].avg_stress || 0).toFixed(1),
        totalCheckins: parseInt(statsResult.rows[0].total_checkins),
        daysTracked: parseInt(statsResult.rows[0].days_tracked),
        currentStreak: await calculateStreak(userId)
      }
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, response, 300);

    // Log data access
    await logDataAccess(userId, 'VIEW_HISTORY', 'checkin', null, { limit, offset });

    res.json(response);
  })
);

// Get specific check-in
router.get('/:checkinId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { checkinId } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const checkinResult = await query(`
      SELECT 
        c.*,
        i.content as intervention_content
      FROM checkins c
      LEFT JOIN interventions i ON c.intervention_shown = i.name
      WHERE c.id = $1 AND c.employee_id = $2
    `, [checkinId, userId]);

    if (checkinResult.rows.length === 0) {
      throw new NotFoundError('Check-in not found');
    }

    // Log data access
    await logDataAccess(userId, 'VIEW_CHECKIN', 'checkin', checkinId);

    res.json(checkinResult.rows[0]);
  })
);

// Update intervention feedback
router.post('/:checkinId/intervention/feedback',
  authenticate,
  [
    body('clicked').isBoolean(),
    body('helpful').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const { checkinId } = req.params;
    const { clicked, helpful } = req.body;
    const userId = req.user.id;

    // Verify ownership and get intervention
    const checkinResult = await query(`
      SELECT intervention_shown, employee_id 
      FROM checkins 
      WHERE id = $1 AND employee_id = $2
    `, [checkinId, userId]);

    if (checkinResult.rows.length === 0) {
      throw new NotFoundError('Check-in not found');
    }

    const interventionName = checkinResult.rows[0].intervention_shown;

    if (!interventionName) {
      throw new ValidationError('No intervention associated with this check-in');
    }

    // Get intervention ID
    const interventionResult = await query(
      'SELECT id FROM interventions WHERE name = $1',
      [interventionName]
    );

    if (interventionResult.rows.length === 0) {
      throw new NotFoundError('Intervention not found');
    }

    const interventionId = interventionResult.rows[0].id;

    // Update check-in if clicked
    if (clicked) {
      await query(
        'UPDATE checkins SET intervention_clicked = true WHERE id = $1',
        [checkinId]
      );
    }

    // Create or update feedback
    await query(`
      INSERT INTO intervention_feedback (
        id, checkin_id, intervention_id, employee_id,
        clicked_at, helpful
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (checkin_id) 
      DO UPDATE SET 
        clicked_at = COALESCE(intervention_feedback.clicked_at, EXCLUDED.clicked_at),
        helpful = COALESCE(EXCLUDED.helpful, intervention_feedback.helpful)
    `, [
      uuidv4(), checkinId, interventionId, userId,
      clicked ? new Date() : null, helpful
    ]);

    // Update intervention effectiveness score
    await updateInterventionEffectiveness(interventionId);

    res.json({ message: 'Feedback recorded successfully' });
  })
);

// Helper function to calculate streak
async function calculateStreak(userId) {
  const result = await query(`
    WITH daily_checkins AS (
      SELECT DATE(created_at) as checkin_date
      FROM checkins
      WHERE employee_id = $1
      ORDER BY created_at DESC
    ),
    consecutive_days AS (
      SELECT 
        checkin_date,
        checkin_date - INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY checkin_date DESC) as group_date
      FROM daily_checkins
    )
    SELECT 
      COUNT(*) as streak
    FROM consecutive_days
    WHERE group_date = (
      SELECT MAX(group_date) 
      FROM consecutive_days 
      WHERE checkin_date >= CURRENT_DATE - INTERVAL '1 day'
    )
  `, [userId]);

  return parseInt(result.rows[0]?.streak || 0);
}

// Helper function to update intervention effectiveness
async function updateInterventionEffectiveness(interventionId) {
  // Calculate effectiveness based on feedback
  const result = await query(`
    WITH feedback_stats AS (
      SELECT 
        COUNT(*) FILTER (WHERE helpful = true) as helpful_count,
        COUNT(*) FILTER (WHERE helpful IS NOT NULL) as total_feedback
      FROM intervention_feedback
      WHERE intervention_id = $1
    )
    UPDATE interventions
    SET effectiveness_score = 
      CASE 
        WHEN (SELECT total_feedback FROM feedback_stats) > 0 
        THEN (SELECT helpful_count::float / total_feedback::float FROM feedback_stats)
        ELSE 0
      END
    WHERE id = $1
  `, [interventionId]);
}

module.exports = router;
