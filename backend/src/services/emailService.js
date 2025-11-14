const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_PORT == 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Send magic link email
async function sendMagicLink(email, firstName, loginUrl) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'MindCheck <noreply@mindcheck.com>',
    to: email,
    subject: 'Your MindCheck Login Link',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>MindCheck</h1>
          </div>
          <div class="content">
            <h2>Hi ${firstName || 'there'},</h2>
            <p>You requested a login link for MindCheck. Click the button below to sign in:</p>
            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">Sign In to MindCheck</a>
            </div>
            <p>This link will expire in 15 minutes for your security.</p>
            <p>If you didn't request this login link, you can safely ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 14px; color: #666;">
              Or copy and paste this link into your browser:<br>
              <span style="color: #4F46E5; word-break: break-all;">${loginUrl}</span>
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} MindCheck. All rights reserved.</p>
            <p>Your mental health matters.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi ${firstName || 'there'},
      
      You requested a login link for MindCheck. 
      
      Click this link to sign in: ${loginUrl}
      
      This link will expire in 15 minutes for your security.
      
      If you didn't request this login link, you can safely ignore this email.
      
      © ${new Date().getFullYear()} MindCheck. All rights reserved.
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    global.logger.info('Magic link sent:', { messageId: info.messageId, to: email });
    return info;
  } catch (error) {
    global.logger.error('Failed to send magic link:', error);
    throw new Error('Failed to send login email');
  }
}

// Send intervention reminder
async function sendInterventionReminder(email, firstName, interventionName) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'MindCheck <noreply@mindcheck.com>',
    to: email,
    subject: `MindCheck: Time for your ${interventionName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Your Wellness Reminder</h2>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>It's time for your scheduled ${interventionName}!</p>
            <p>Taking a few minutes for your mental health can make a big difference.</p>
            <p>Open the MindCheck app to get started.</p>
            <p>Stay well,<br>The MindCheck Team</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    global.logger.error('Failed to send intervention reminder:', error);
  }
}

// Send daily check-in reminder
async function sendCheckInReminder(email, firstName) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'MindCheck <noreply@mindcheck.com>',
    to: email,
    subject: 'Time for your daily MindCheck',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Daily Check-In Reminder</h2>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Take 2 minutes to check in with yourself today.</p>
            <p>Your daily check-in helps you track your stress levels and get personalized support.</p>
            <p>Open the MindCheck app to complete your check-in.</p>
            <p>Have a great day!<br>The MindCheck Team</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    global.logger.error('Failed to send check-in reminder:', error);
  }
}

// Send crisis alert to admin
async function sendCrisisAlert(adminEmail, employeeName, flaggedContent, timestamp) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'MindCheck <alerts@mindcheck.com>',
    to: adminEmail,
    subject: '🚨 URGENT: Crisis Response Needed',
    priority: 'high',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { background: #FEF2F2; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid #DC2626; }
          .actions { background: #f9f9f9; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="alert">
            <h1>⚠️ Crisis Alert - Immediate Action Required</h1>
          </div>
          <div class="content">
            <h2>Employee: ${employeeName}</h2>
            <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
            <p><strong>Flagged Content:</strong></p>
            <blockquote style="background: white; padding: 15px; border-left: 4px solid #DC2626;">
              "${flaggedContent}"
            </blockquote>
          </div>
          <div class="actions">
            <h3>Immediate Actions:</h3>
            <ol>
              <li>Log into the MindCheck admin dashboard to view full details</li>
              <li>Contact the employee immediately</li>
              <li>If unable to reach, contact their emergency contact</li>
              <li>Consider calling ${process.env.CRISIS_HOTLINE || '988'} for guidance</li>
            </ol>
            <p style="margin-top: 20px;">
              <a href="${process.env.WEB_APP_URL}/admin/alerts" style="background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View in Dashboard
              </a>
            </p>
          </div>
          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
            This is an automated alert from MindCheck. Please treat this information as confidential.
          </p>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    global.logger.warn('Crisis alert sent:', { messageId: info.messageId, to: adminEmail });
    return info;
  } catch (error) {
    global.logger.error('Failed to send crisis alert:', error);
    throw new Error('Failed to send crisis alert');
  }
}

// Send weekly summary to admin
async function sendWeeklySummary(adminEmail, companyName, summaryData) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'MindCheck <reports@mindcheck.com>',
    to: adminEmail,
    subject: `Weekly MindCheck Summary for ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .metric { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 6px; }
          .metric-label { color: #666; font-size: 14px; }
          .metric-value { font-size: 24px; font-weight: bold; color: #4F46E5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Weekly Wellness Summary</h1>
            <p>${summaryData.weekRange}</p>
          </div>
          <div class="content">
            <h2>Key Metrics for ${companyName}</h2>
            
            <div class="metric">
              <div class="metric-label">Average Stress Level</div>
              <div class="metric-value">${summaryData.avgStressLevel}/10</div>
              <p>${summaryData.stressTrend}</p>
            </div>
            
            <div class="metric">
              <div class="metric-label">Check-in Completion Rate</div>
              <div class="metric-value">${summaryData.completionRate}%</div>
            </div>
            
            <div class="metric">
              <div class="metric-label">Top Stress Triggers</div>
              <ol>
                ${summaryData.topTriggers.map(t => `<li>${t.name} (${t.percentage}%)</li>`).join('')}
              </ol>
            </div>
            
            <div class="metric">
              <div class="metric-label">Most Effective Interventions</div>
              <ol>
                ${summaryData.topInterventions.map(i => `<li>${i.name} (${i.effectiveness}% effective)</li>`).join('')}
              </ol>
            </div>
            
            <p style="margin-top: 30px;">
              <a href="${process.env.WEB_APP_URL}/admin/dashboard" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Full Dashboard
              </a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    global.logger.error('Failed to send weekly summary:', error);
  }
}

module.exports = {
  sendMagicLink,
  sendInterventionReminder,
  sendCheckInReminder,
  sendCrisisAlert,
  sendWeeklySummary
};
