const express = require('express');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { getPersonalizedInterventions } = require('../services/interventionEngine');
const { query, cache } = require('../db/connection');
const { body, validationResult } = require('express-validator');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all available interventions
router.get('/',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { type, personalized } = req.query;

    if (personalized === 'true') {
      // Get personalized interventions based on user history
      const interventions = await getPersonalizedInterventions(userId);
      return res.json({ interventions });
    }

    // Check cache
    const cacheKey = `interventions:${type || 'all'}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Build query
    let queryText = 'SELECT * FROM interventions WHERE 1=1';
    const params = [];

    if (type) {
      queryText += ' AND type = $1';
      params.push(type);
    }

    queryText += ' ORDER BY effectiveness_score DESC, name ASC';

    const result = await query(queryText, params);

    const response = {
      interventions: result.rows.map(intervention => ({
        id: intervention.id,
        name: intervention.name,
        type: intervention.type,
        contentType: intervention.content_type,
        content: intervention.content,
        duration: intervention.duration_minutes,
        effectivenessScore: Math.round(intervention.effectiveness_score * 100)
      }))
    };

    // Cache for 1 hour
    await cache.set(cacheKey, response, 3600);

    res.json(response);
  })
);

// Get specific intervention
router.get('/:interventionId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { interventionId } = req.params;

    const result = await query(
      'SELECT * FROM interventions WHERE id = $1',
      [interventionId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Intervention not found');
    }

    const intervention = result.rows[0];

    // Get user-specific effectiveness if available
    const userStatsResult = await query(`
      SELECT 
        COUNT(*) as times_used,
        COUNT(CASE WHEN helpful = true THEN 1 END) as times_helpful
      FROM intervention_feedback
      WHERE intervention_id = $1 AND employee_id = $2
    `, [interventionId, req.user.id]);

    const userStats = userStatsResult.rows[0];
    const personalEffectiveness = userStats.times_used > 0 
      ? Math.round((userStats.times_helpful / userStats.times_used) * 100)
      : null;

    res.json({
      id: intervention.id,
      name: intervention.name,
      type: intervention.type,
      contentType: intervention.content_type,
      content: intervention.content,
      duration: intervention.duration_minutes,
      effectivenessScore: Math.round(intervention.effectiveness_score * 100),
      personalStats: {
        timesUsed: parseInt(userStats.times_used),
        personalEffectiveness
      }
    });
  })
);

// Submit intervention feedback
router.post('/:interventionId/feedback',
  authenticate,
  [
    body('helpful').isBoolean().withMessage('Helpful must be true or false'),
    body('checkinId').optional().isUUID(),
    body('completed').optional().isBoolean(),
    body('notes').optional().isString().isLength({ max: 500 })
  ],
  asyncHandler(async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { interventionId } = req.params;
    const { helpful, checkinId, completed, notes } = req.body;
    const userId = req.user.id;

    // Verify intervention exists
    const interventionResult = await query(
      'SELECT id FROM interventions WHERE id = $1',
      [interventionId]
    );

    if (interventionResult.rows.length === 0) {
      throw new NotFoundError('Intervention not found');
    }

    // If checkinId provided, verify ownership
    if (checkinId) {
      const checkinResult = await query(
        'SELECT id FROM checkins WHERE id = $1 AND employee_id = $2',
        [checkinId, userId]
      );

      if (checkinResult.rows.length === 0) {
        throw new NotFoundError('Check-in not found or unauthorized');
      }
    }

    // Create feedback record
    await query(`
      INSERT INTO intervention_feedback (
        id,
        checkin_id,
        intervention_id,
        employee_id,
        clicked_at,
        completed,
        helpful
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6)
    `, [
      uuidv4(),
      checkinId,
      interventionId,
      userId,
      completed,
      helpful
    ]);

    // Update intervention effectiveness
    await query(`
      UPDATE interventions
      SET effectiveness_score = (
        SELECT 
          COALESCE(
            COUNT(CASE WHEN helpful = true THEN 1 END)::float / 
            NULLIF(COUNT(CASE WHEN helpful IS NOT NULL THEN 1 END), 0),
            0.5
          )
        FROM intervention_feedback
        WHERE intervention_id = $1
      )
      WHERE id = $1
    `, [interventionId]);

    // Invalidate caches
    await cache.invalidatePattern('interventions:*');
    await cache.invalidatePattern(`user:${userId}:interventions`);

    res.json({ 
      message: 'Feedback submitted successfully',
      helpful
    });
  })
);

// Get intervention history for user
router.get('/history/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await query(`
      SELECT 
        if.id,
        if.created_at,
        if.helpful,
        if.completed,
        i.name as intervention_name,
        i.type as intervention_type,
        i.duration_minutes,
        c.stress_level as checkin_stress_level
      FROM intervention_feedback if
      JOIN interventions i ON if.intervention_id = i.id
      LEFT JOIN checkins c ON if.checkin_id = c.id
      WHERE if.employee_id = $1
      ORDER BY if.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM intervention_feedback WHERE employee_id = $1',
      [userId]
    );

    // Calculate stats
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_interventions,
        COUNT(CASE WHEN helpful = true THEN 1 END) as helpful_count,
        COUNT(DISTINCT intervention_id) as unique_interventions,
        COUNT(CASE WHEN completed = true THEN 1 END) as completed_count
      FROM intervention_feedback
      WHERE employee_id = $1
    `, [userId]);

    const stats = statsResult.rows[0];
    const helpfulRate = stats.total_interventions > 0
      ? Math.round((stats.helpful_count / stats.total_interventions) * 100)
      : 0;

    res.json({
      history: result.rows,
      total: parseInt(countResult.rows[0].count),
      stats: {
        totalInterventions: parseInt(stats.total_interventions),
        uniqueInterventions: parseInt(stats.unique_interventions),
        completedCount: parseInt(stats.completed_count),
        helpfulRate
      }
    });
  })
);

// Get recommended interventions based on current state
router.post('/recommend',
  authenticate,
  [
    body('stressLevel').isInt({ min: 1, max: 10 }),
    body('stressTrigger').optional().isIn(['workload', 'meetings', 'team_conflict', 'unclear_goals', 'personal', 'other']),
    body('timeAvailable').optional().isInt({ min: 1, max: 60 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { stressLevel, stressTrigger, timeAvailable } = req.body;
    const userId = req.user.id;

    // Get personalized recommendations
    let queryText = `
      WITH user_preferences AS (
        SELECT 
          intervention_id,
          AVG(CASE WHEN helpful = true THEN 1 ELSE 0 END) as personal_effectiveness
        FROM intervention_feedback
        WHERE employee_id = $1
        GROUP BY intervention_id
      )
      SELECT 
        i.*,
        COALESCE(up.personal_effectiveness, 0.5) as personal_score
      FROM interventions i
      LEFT JOIN user_preferences up ON i.id = up.intervention_id
      WHERE $2 >= i.stress_level_range[1] 
      AND $2 <= i.stress_level_range[2]
    `;

    const params = [userId, stressLevel];

    // Filter by time available
    if (timeAvailable) {
      queryText += ' AND i.duration_minutes <= $3';
      params.push(timeAvailable);
    }

    // Filter by trigger type
    if (stressTrigger) {
      const triggerTypeMap = {
        workload: ['break', 'breathing'],
        meetings: ['breathing', 'meditation'],
        team_conflict: ['social', 'journaling'],
        unclear_goals: ['journaling', 'break'],
        personal: ['meditation', 'social'],
        other: ['meditation', 'breathing']
      };
      
      const preferredTypes = triggerTypeMap[stressTrigger] || [];
      if (preferredTypes.length > 0) {
        queryText += ` AND i.type = ANY($${params.length + 1}::text[])`;
        params.push(preferredTypes);
      }
    }

    queryText += ' ORDER BY personal_score DESC, effectiveness_score DESC LIMIT 3';

    const result = await query(queryText, params);

    res.json({
      recommendations: result.rows.map(intervention => ({
        id: intervention.id,
        name: intervention.name,
        type: intervention.type,
        duration: intervention.duration_minutes,
        content: intervention.content,
        reason: getRecommendationReason(intervention, stressLevel, stressTrigger)
      }))
    });
  })
);

// Helper function to generate recommendation reason
function getRecommendationReason(intervention, stressLevel, stressTrigger) {
  const reasons = [];

  if (stressLevel >= 8) {
    reasons.push('Helps manage high stress levels');
  } else if (stressLevel <= 4) {
    reasons.push('Maintains your positive state');
  }

  if (stressTrigger) {
    const triggerReasons = {
      workload: 'Effective for workload-related stress',
      meetings: 'Helps decompress after meetings',
      team_conflict: 'Supports emotional regulation',
      unclear_goals: 'Provides clarity and focus',
      personal: 'Addresses personal stressors',
      other: 'General stress relief'
    };
    reasons.push(triggerReasons[stressTrigger]);
  }

  if (intervention.duration_minutes <= 5) {
    reasons.push('Quick and easy to complete');
  }

  return reasons.join('. ');
}

module.exports = router;
