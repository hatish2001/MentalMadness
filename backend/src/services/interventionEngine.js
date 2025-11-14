const { query, cache } = require('../db/connection');

// Intervention recommendation rules
const INTERVENTION_RULES = {
  // High stress (8-10)
  high_stress: {
    stressRange: [8, 10],
    priorities: ['breathing', 'meditation', 'break'],
    avoidTypes: ['activity'] // Too stimulating for high stress
  },
  
  // Medium stress (5-7)
  medium_stress: {
    stressRange: [5, 7],
    priorities: ['activity', 'meditation', 'social'],
    avoidTypes: []
  },
  
  // Low stress (1-4)
  low_stress: {
    stressRange: [1, 4],
    priorities: ['journaling', 'activity', 'social'],
    avoidTypes: ['breathing'] // Not needed for low stress
  }
};

// Trigger-specific recommendations
const TRIGGER_INTERVENTIONS = {
  workload: ['break', 'breathing', 'activity'],
  meetings: ['breathing', 'meditation', 'break'],
  team_conflict: ['social', 'journaling', 'meditation'],
  unclear_goals: ['journaling', 'break', 'social'],
  personal: ['meditation', 'social', 'journaling'],
  other: ['meditation', 'breathing', 'activity']
};

// Get recommended intervention for user
async function recommendIntervention(stressLevel, stressTrigger, previousHelper) {
  try {
    // Determine stress category
    let stressCategory = 'medium_stress';
    if (stressLevel >= 8) {
      stressCategory = 'high_stress';
    } else if (stressLevel <= 4) {
      stressCategory = 'low_stress';
    }

    const rules = INTERVENTION_RULES[stressCategory];
    
    // Get all available interventions
    const interventionsResult = await query(`
      SELECT * FROM interventions
      WHERE $1 >= stress_level_range[1] 
      AND $1 <= stress_level_range[2]
      ORDER BY effectiveness_score DESC
    `, [stressLevel]);

    if (interventionsResult.rows.length === 0) {
      return null;
    }

    let interventions = interventionsResult.rows;

    // Filter out avoided types
    if (rules.avoidTypes.length > 0) {
      interventions = interventions.filter(i => !rules.avoidTypes.includes(i.type));
    }

    // Prioritize based on stress trigger
    const triggerPriorities = TRIGGER_INTERVENTIONS[stressTrigger] || [];
    
    // Score each intervention
    const scoredInterventions = interventions.map(intervention => {
      let score = intervention.effectiveness_score * 100;
      
      // Bonus for matching priority types
      if (rules.priorities.includes(intervention.type)) {
        score += 20;
      }
      
      // Bonus for matching trigger recommendations
      if (triggerPriorities.includes(intervention.type)) {
        score += 15;
      }
      
      // Penalty if it was the previous helper (encourage variety)
      if (previousHelper === intervention.name) {
        score -= 10;
      }
      
      // Random factor for variety (0-10 points)
      score += Math.random() * 10;
      
      return { ...intervention, score };
    });

    // Sort by score and return top recommendation
    scoredInterventions.sort((a, b) => b.score - a.score);
    
    return scoredInterventions[0];
  } catch (error) {
    global.logger.error('Failed to recommend intervention:', error);
    return null;
  }
}

// Get personalized interventions based on user history
async function getPersonalizedInterventions(userId, limit = 5) {
  try {
    // Check cache first
    const cacheKey = `user:${userId}:interventions`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get user's intervention history
    const historyResult = await query(`
      WITH user_effectiveness AS (
        SELECT 
          i.id,
          i.name,
          i.type,
          COUNT(CASE WHEN if.helpful = true THEN 1 END)::float / 
          NULLIF(COUNT(CASE WHEN if.helpful IS NOT NULL THEN 1 END), 0) as personal_effectiveness,
          COUNT(*) as usage_count
        FROM interventions i
        LEFT JOIN intervention_feedback if ON i.id = if.intervention_id
        WHERE if.employee_id = $1 OR if.employee_id IS NULL
        GROUP BY i.id, i.name, i.type
      )
      SELECT 
        ue.*,
        i.content,
        i.duration_minutes,
        i.effectiveness_score as global_effectiveness,
        COALESCE(ue.personal_effectiveness, i.effectiveness_score, 0.5) as combined_effectiveness
      FROM user_effectiveness ue
      JOIN interventions i ON ue.id = i.id
      ORDER BY combined_effectiveness DESC, usage_count DESC
      LIMIT $2
    `, [userId, limit]);

    const interventions = historyResult.rows;

    // Cache for 1 hour
    await cache.set(cacheKey, interventions, 3600);

    return interventions;
  } catch (error) {
    global.logger.error('Failed to get personalized interventions:', error);
    return [];
  }
}

// Track intervention performance
async function trackInterventionPerformance(interventionId, wasHelpful, followUpStressLevel) {
  try {
    await query(`
      INSERT INTO intervention_feedback (
        intervention_id,
        helpful,
        follow_up_stress_level
      ) VALUES ($1, $2, $3)
    `, [interventionId, wasHelpful, followUpStressLevel]);

    // Update global effectiveness score
    await updateInterventionEffectiveness(interventionId);
  } catch (error) {
    global.logger.error('Failed to track intervention performance:', error);
  }
}

// Update intervention effectiveness based on feedback
async function updateInterventionEffectiveness(interventionId) {
  try {
    const result = await query(`
      WITH feedback_stats AS (
        SELECT 
          COUNT(CASE WHEN helpful = true THEN 1 END)::float as helpful_count,
          COUNT(CASE WHEN helpful IS NOT NULL THEN 1 END)::float as total_feedback,
          AVG(CASE 
            WHEN follow_up_stress_level IS NOT NULL 
            THEN follow_up_stress_level 
          END) as avg_follow_up_stress
        FROM intervention_feedback
        WHERE intervention_id = $1
      ),
      effectiveness AS (
        SELECT 
          CASE 
            WHEN total_feedback > 0 
            THEN helpful_count / total_feedback
            ELSE 0.5
          END as score
        FROM feedback_stats
      )
      UPDATE interventions
      SET 
        effectiveness_score = (SELECT score FROM effectiveness),
        updated_at = NOW()
      WHERE id = $1
    `, [interventionId]);

    // Invalidate caches
    await cache.invalidatePattern('user:*:interventions');
  } catch (error) {
    global.logger.error('Failed to update intervention effectiveness:', error);
  }
}

// Get intervention statistics for a company
async function getCompanyInterventionStats(companyId, dateRange = 30) {
  try {
    const result = await query(`
      WITH company_usage AS (
        SELECT 
          i.name,
          i.type,
          COUNT(*) as times_shown,
          COUNT(CASE WHEN c.intervention_clicked THEN 1 END) as times_clicked,
          COUNT(CASE WHEN if.helpful = true THEN 1 END) as times_helpful,
          AVG(c.stress_level) as avg_stress_when_shown,
          AVG(if.follow_up_stress_level) as avg_follow_up_stress
        FROM checkins c
        JOIN interventions i ON c.intervention_shown = i.name
        LEFT JOIN intervention_feedback if ON c.id = if.checkin_id
        WHERE c.company_id = $1
        AND c.created_at >= NOW() - INTERVAL '%s days'
        GROUP BY i.name, i.type
      )
      SELECT 
        name,
        type,
        times_shown,
        times_clicked,
        ROUND((times_clicked::float / NULLIF(times_shown, 0)) * 100) as click_rate,
        times_helpful,
        ROUND((times_helpful::float / NULLIF(times_clicked, 0)) * 100) as helpful_rate,
        ROUND(avg_stress_when_shown::numeric, 1) as avg_stress_when_shown,
        ROUND(avg_follow_up_stress::numeric, 1) as avg_follow_up_stress,
        ROUND((avg_stress_when_shown - avg_follow_up_stress)::numeric, 1) as stress_reduction
      FROM company_usage
      ORDER BY times_shown DESC
    `, [companyId, dateRange]);

    return result.rows;
  } catch (error) {
    global.logger.error('Failed to get company intervention stats:', error);
    return [];
  }
}

// Analyze intervention effectiveness by trigger
async function analyzeInterventionsByTrigger(companyId) {
  try {
    const result = await query(`
      SELECT 
        c.stress_trigger,
        i.type as intervention_type,
        COUNT(*) as usage_count,
        AVG(CASE WHEN if.helpful = true THEN 1 ELSE 0 END) * 100 as effectiveness_rate
      FROM checkins c
      JOIN interventions i ON c.intervention_shown = i.name
      LEFT JOIN intervention_feedback if ON c.id = if.checkin_id
      WHERE c.company_id = $1
      AND if.helpful IS NOT NULL
      GROUP BY c.stress_trigger, i.type
      HAVING COUNT(*) >= 5  -- Minimum sample size
      ORDER BY c.stress_trigger, effectiveness_rate DESC
    `, [companyId]);

    // Group by trigger
    const analysis = {};
    result.rows.forEach(row => {
      if (!analysis[row.stress_trigger]) {
        analysis[row.stress_trigger] = [];
      }
      analysis[row.stress_trigger].push({
        type: row.intervention_type,
        usageCount: row.usage_count,
        effectiveness: Math.round(row.effectiveness_rate)
      });
    });

    return analysis;
  } catch (error) {
    global.logger.error('Failed to analyze interventions by trigger:', error);
    return {};
  }
}

module.exports = {
  recommendIntervention,
  getPersonalizedInterventions,
  trackInterventionPerformance,
  updateInterventionEffectiveness,
  getCompanyInterventionStats,
  analyzeInterventionsByTrigger
};
