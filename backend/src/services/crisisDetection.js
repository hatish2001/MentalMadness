const { sendCrisisAlert } = require('./emailService');
const { query } = require('../db/connection');

// Crisis trigger words and phrases
const CRISIS_KEYWORDS = {
  critical: [
    'kill myself',
    'end my life',
    'suicide',
    'suicidal',
    'want to die',
    'better off dead',
    'no reason to live',
    'end it all'
  ],
  high: [
    'hurt myself',
    'self harm',
    'self-harm',
    'cutting',
    'can\'t take it anymore',
    'can\'t go on',
    'hopeless',
    'no way out',
    'give up',
    'worthless'
  ],
  medium: [
    'hate my life',
    'hate myself',
    'no one cares',
    'nobody cares',
    'all alone',
    'can\'t cope',
    'breaking down',
    'falling apart',
    'losing it'
  ]
};

// Detect crisis indicators in text
async function detectCrisis(text, stressLevel) {
  if (!text) {
    return { isCrisis: false };
  }

  const lowerText = text.toLowerCase();
  const detectedWords = [];
  let severity = null;

  // Check for critical keywords
  for (const word of CRISIS_KEYWORDS.critical) {
    if (lowerText.includes(word)) {
      detectedWords.push(word);
      severity = 'critical';
    }
  }

  // If no critical, check for high severity
  if (!severity) {
    for (const word of CRISIS_KEYWORDS.high) {
      if (lowerText.includes(word)) {
        detectedWords.push(word);
        severity = 'high';
      }
    }
  }

  // If no high, check for medium severity
  if (!severity) {
    for (const word of CRISIS_KEYWORDS.medium) {
      if (lowerText.includes(word)) {
        detectedWords.push(word);
        severity = 'medium';
      }
    }
  }

  // Also flag if stress level is 10 with concerning text
  if (stressLevel === 10 && !severity && containsConcerningLanguage(lowerText)) {
    severity = 'medium';
    detectedWords.push('extreme stress level');
  }

  if (severity) {
    return {
      isCrisis: true,
      severity,
      triggerWords: detectedWords,
      reason: `Detected ${severity} severity crisis indicators`
    };
  }

  return { isCrisis: false };
}

// Check for concerning language patterns
function containsConcerningLanguage(text) {
  const concerningPatterns = [
    /i (can't|cannot|don't|do not) (take|handle|deal|cope)/,
    /nothing (matters|helps|works)/,
    /no one (understands|gets it|listens)/,
    /(everyone|everything) (hates|is against)/,
    /i('m| am) (done|finished|through)/
  ];

  return concerningPatterns.some(pattern => pattern.test(text));
}

// Process flagged response and notify appropriate parties
async function processFlaggedResponse(flaggedResponseId) {
  try {
    // Get flagged response details
    const flaggedResult = await query(`
      SELECT 
        fr.*, 
        e.first_name, 
        e.last_name, 
        e.email as employee_email,
        c.stress_trigger_details
      FROM flagged_responses fr
      JOIN employees e ON fr.employee_id = e.id
      JOIN checkins c ON fr.checkin_id = c.id
      WHERE fr.id = $1
    `, [flaggedResponseId]);

    if (flaggedResult.rows.length === 0) {
      throw new Error('Flagged response not found');
    }

    const flagged = flaggedResult.rows[0];

    // Get company admins
    const adminsResult = await query(`
      SELECT email, first_name, last_name
      FROM employees
      WHERE company_id = $1 AND is_admin = true AND is_active = true
    `, [flagged.company_id]);

    // Send alerts to all admins
    const employeeName = `${flagged.first_name} ${flagged.last_name}`;
    
    for (const admin of adminsResult.rows) {
      await sendCrisisAlert(
        admin.email,
        employeeName,
        flagged.stress_trigger_details,
        flagged.flagged_at
      );
    }

    // Log notification sent
    global.logger.warn('Crisis alerts sent', {
      flaggedResponseId,
      employeeId: flagged.employee_id,
      severity: flagged.severity,
      adminsNotified: adminsResult.rows.length
    });

    return true;
  } catch (error) {
    global.logger.error('Failed to process flagged response:', error);
    throw error;
  }
}

// Get crisis resources based on severity
function getCrisisResources(severity) {
  const baseResources = {
    hotline: process.env.CRISIS_HOTLINE || '988',
    textLine: process.env.CRISIS_TEXT_LINE || '741741',
    emergency: '911'
  };

  switch (severity) {
    case 'critical':
      return {
        ...baseResources,
        message: 'Your safety is our top priority. Please reach out for immediate help.',
        actions: [
          `Call the crisis hotline: ${baseResources.hotline}`,
          `Text "HELLO" to ${baseResources.textLine}`,
          'Call 911 if you are in immediate danger',
          'Reach out to a trusted friend or family member'
        ]
      };
    
    case 'high':
      return {
        ...baseResources,
        message: 'We\'re concerned about you. Support is available.',
        actions: [
          `Crisis hotline: ${baseResources.hotline}`,
          `Text support: ${baseResources.textLine}`,
          'Talk to your manager or HR',
          'Contact your company\'s EAP provider'
        ]
      };
    
    case 'medium':
      return {
        ...baseResources,
        message: 'It sounds like you\'re going through a tough time.',
        actions: [
          'Consider talking to someone you trust',
          'Try a calming intervention from the app',
          `Support is available at ${baseResources.hotline}`,
          'Your company EAP can provide counseling'
        ]
      };
    
    default:
      return baseResources;
  }
}

// Analyze trends for early warning signs
async function analyzeEmployeeTrends(employeeId) {
  // Get last 14 days of check-ins
  const trendsResult = await query(`
    SELECT 
      stress_level,
      stress_trigger,
      created_at
    FROM checkins
    WHERE employee_id = $1
    AND created_at >= NOW() - INTERVAL '14 days'
    ORDER BY created_at ASC
  `, [employeeId]);

  if (trendsResult.rows.length < 3) {
    return { hasWarningSign: false };
  }

  const checkins = trendsResult.rows;
  
  // Warning signs:
  // 1. Consistent high stress (>7) for 5+ days
  // 2. Rapid increase in stress levels
  // 3. Same stress trigger repeatedly
  
  const recentHighStress = checkins
    .slice(-5)
    .filter(c => c.stress_level > 7).length >= 4;
  
  const avgLastWeek = checkins
    .slice(-7)
    .reduce((sum, c) => sum + c.stress_level, 0) / Math.min(7, checkins.length);
  
  const avgPreviousWeek = checkins
    .slice(0, 7)
    .reduce((sum, c) => sum + c.stress_level, 0) / Math.min(7, checkins.slice(0, 7).length);
  
  const rapidIncrease = avgLastWeek - avgPreviousWeek >= 2;
  
  // Check for repeated triggers
  const triggerCounts = {};
  checkins.forEach(c => {
    triggerCounts[c.stress_trigger] = (triggerCounts[c.stress_trigger] || 0) + 1;
  });
  
  const dominantTrigger = Object.entries(triggerCounts)
    .sort(([,a], [,b]) => b - a)[0];
  
  const repeatedTrigger = dominantTrigger && dominantTrigger[1] >= 5;

  return {
    hasWarningSign: recentHighStress || rapidIncrease || repeatedTrigger,
    indicators: {
      recentHighStress,
      rapidIncrease,
      repeatedTrigger: repeatedTrigger ? dominantTrigger[0] : null,
      averageStress: avgLastWeek
    }
  };
}

module.exports = {
  detectCrisis,
  processFlaggedResponse,
  getCrisisResources,
  analyzeEmployeeTrends
};
