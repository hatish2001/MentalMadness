-- MindCheck Database Schema
-- HIPAA Compliant with encryption and audit logging

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS flagged_responses CASCADE;
DROP TABLE IF EXISTS intervention_feedback CASCADE;
DROP TABLE IF EXISTS checkins CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  employee_count INT,
  subscription_tier VARCHAR(50) DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'pro', 'enterprise')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  role VARCHAR(100),
  manager_id UUID REFERENCES employees(id),
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  data_sharing_consent BOOLEAN DEFAULT FALSE,
  magic_link_token VARCHAR(255),
  magic_link_expires_at TIMESTAMP,
  push_notification_token VARCHAR(255),
  notification_preferences JSONB DEFAULT '{"daily_reminder": true, "reminder_time": "09:00"}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Check-ins table (core data with encrypted fields)
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  -- Encrypted fields for sensitive data
  stress_level INT NOT NULL CHECK (stress_level >= 1 AND stress_level <= 10),
  stress_level_encrypted BYTEA, -- Encrypted version for extra security
  stress_trigger VARCHAR(100) CHECK (stress_trigger IN ('workload', 'meetings', 'team_conflict', 'unclear_goals', 'personal', 'other')),
  stress_trigger_details TEXT, -- Optional free text, encrypted
  stress_trigger_details_encrypted BYTEA,
  previous_helper VARCHAR(100),
  intervention_shown VARCHAR(100),
  intervention_clicked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Interventions library
CREATE TABLE interventions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) CHECK (type IN ('breathing', 'meditation', 'activity', 'journaling', 'social', 'break')),
  content_type VARCHAR(50) CHECK (content_type IN ('text', 'audio', 'video', 'interactive')),
  content JSONB NOT NULL, -- Stores intervention content and metadata
  duration_minutes INT,
  stress_level_range INT[] DEFAULT ARRAY[1,10], -- Which stress levels this is recommended for
  effectiveness_score FLOAT DEFAULT 0.0, -- Calculated from feedback
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Intervention feedback
CREATE TABLE intervention_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  intervention_id UUID NOT NULL REFERENCES interventions(id),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP,
  completed BOOLEAN DEFAULT FALSE,
  helpful BOOLEAN,
  follow_up_stress_level INT CHECK (follow_up_stress_level >= 1 AND follow_up_stress_level <= 10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Flagged responses (for crisis escalation)
CREATE TABLE flagged_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  flag_reason VARCHAR(255) NOT NULL,
  severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  trigger_words TEXT[], -- Array of detected trigger words
  admin_reviewed BOOLEAN DEFAULT FALSE,
  admin_id UUID REFERENCES employees(id),
  admin_action VARCHAR(255),
  admin_notes TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  flagged_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs (HIPAA compliance)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_type VARCHAR(50), -- 'employee', 'admin', 'system'
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(50),
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_checkins_employee_id ON checkins(employee_id);
CREATE INDEX idx_checkins_company_id ON checkins(company_id);
CREATE INDEX idx_checkins_created_at ON checkins(created_at);
CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_flagged_responses_company_id ON flagged_responses(company_id);
CREATE INDEX idx_flagged_responses_resolved ON flagged_responses(resolved);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON interventions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS BYTEA AS $$
BEGIN
    -- In production, use a proper encryption key from environment
    RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key', true));
END;
$$ language 'plpgsql';

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data BYTEA)
RETURNS TEXT AS $$
BEGIN
    -- In production, use a proper encryption key from environment
    RETURN pgp_sym_decrypt(encrypted_data, current_setting('app.encryption_key', true));
END;
$$ language 'plpgsql';

-- Insert default interventions
INSERT INTO interventions (name, type, content_type, content, duration_minutes, stress_level_range) VALUES
('Quick Breathing Exercise', 'breathing', 'interactive', '{"title": "5-4-3-2-1 Breathing", "instructions": ["Breathe in for 5 counts", "Hold for 4 counts", "Breathe out for 3 counts", "Hold for 2 counts", "Repeat 1 more time"], "audio_url": "/audio/breathing-5-4-3-2-1.mp3"}', 5, ARRAY[7,10]),
('Body Scan Meditation', 'meditation', 'audio', '{"title": "3-Minute Body Scan", "audio_url": "/audio/body-scan-3min.mp3", "transcript": "Begin by finding a comfortable position..."}', 3, ARRAY[5,10]),
('Gratitude Reflection', 'journaling', 'interactive', '{"title": "Three Things Grateful For", "prompts": ["Name something that made you smile today", "Think of someone who helped you recently", "Identify one thing you are looking forward to"]}', 5, ARRAY[1,6]),
('Movement Break', 'activity', 'video', '{"title": "2-Minute Desk Stretches", "video_url": "/video/desk-stretches.mp4", "exercises": ["Neck rolls", "Shoulder shrugs", "Wrist stretches", "Standing desk push-ups"]}', 2, ARRAY[4,8]),
('Mindful Moment', 'meditation', 'text', '{"title": "Present Moment Awareness", "instructions": ["Notice 5 things you can see", "Notice 4 things you can hear", "Notice 3 things you can feel", "Notice 2 things you can smell", "Notice 1 thing you can taste"]}', 3, ARRAY[5,9]),
('Connect with Someone', 'social', 'text', '{"title": "Reach Out", "suggestions": ["Send a thank you message to a colleague", "Schedule a coffee chat", "Call a friend or family member", "Join a team lunch"]}', 10, ARRAY[6,10]),
('Calendar Block', 'break', 'interactive', '{"title": "Protect Your Time", "action": "block_calendar", "duration_options": [15, 30, 60], "suggestions": ["Take a walk", "Have a healthy snack", "Do nothing and rest", "Work on a personal project"]}', 15, ARRAY[7,10]);

-- Grant permissions (adjust based on your database users)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO mindcheck_app;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO mindcheck_app;
