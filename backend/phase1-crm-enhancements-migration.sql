    -- =====================================================
    -- PHASE 1 CRM ENHANCEMENTS - DATABASE MIGRATION
    -- Created: December 29, 2025
    -- Description: Comprehensive migration for Phase 1 features
    -- =====================================================

    -- =====================================================
    -- 1. DEAL STAGE CUSTOMIZATION
    -- =====================================================

    -- Custom deal stages table
    CREATE TABLE IF NOT EXISTS custom_deal_stages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(50) DEFAULT '#3B82F6',
        position INTEGER NOT NULL DEFAULT 0,
        default_probability INTEGER DEFAULT 50 CHECK (default_probability >= 0 AND default_probability <= 100),
        is_active BOOLEAN DEFAULT true,
        is_system BOOLEAN DEFAULT false,
        pipeline_id INTEGER DEFAULT 1,
        required_fields JSONB DEFAULT '[]'::jsonb,
        auto_move_after_days INTEGER,
        stage_type VARCHAR(50) DEFAULT 'open' CHECK (stage_type IN ('open', 'won', 'lost')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Add unique constraint on position per pipeline
    CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_deal_stages_position 
    ON custom_deal_stages(pipeline_id, position) WHERE is_active = true;

    -- Pipeline definitions table
    CREATE TABLE IF NOT EXISTS sales_pipelines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Prevent duplicate pipeline names (keeps reruns idempotent)
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_pipelines_name_unique
    ON sales_pipelines(name);

    -- Insert default pipeline
    INSERT INTO sales_pipelines (name, description, is_default, is_active)
    VALUES ('Default Sales Pipeline', 'Standard B2B sales pipeline', true, true)
    ON CONFLICT (name) DO NOTHING;

    -- Insert default stages
    INSERT INTO custom_deal_stages (name, color, position, default_probability, is_system, pipeline_id, stage_type)
    VALUES 
        ('Lead', '#94A3B8', 1, 10, true, 1, 'open'),
        ('Qualified', '#3B82F6', 2, 25, true, 1, 'open'),
        ('Proposal', '#8B5CF6', 3, 50, true, 1, 'open'),
        ('Negotiation', '#F59E0B', 4, 75, true, 1, 'open'),
        ('Won', '#10B981', 5, 100, true, 1, 'won'),
        ('Lost', '#EF4444', 6, 0, true, 1, 'lost')
    ON CONFLICT DO NOTHING;

    -- Add pipeline_id to deals table if not exists
    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='deals' AND column_name='pipeline_id') THEN
            ALTER TABLE deals ADD COLUMN pipeline_id INTEGER DEFAULT 1 REFERENCES sales_pipelines(id);
        END IF;
    END $$;

    -- =====================================================
    -- 2. ADVANCED ACTIVITY LOGGING
    -- =====================================================

    -- Add new fields to activities table
    DO $$ 
    BEGIN
        -- Add outcome field
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='activities' AND column_name='outcome') THEN
            ALTER TABLE activities ADD COLUMN outcome VARCHAR(50) CHECK (outcome IN ('positive', 'neutral', 'negative', 'no_answer', 'callback_scheduled'));
        END IF;
        
        -- Add call recording URL
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='activities' AND column_name='recording_url') THEN
            ALTER TABLE activities ADD COLUMN recording_url TEXT;
        END IF;
        
        -- Add sentiment
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='activities' AND column_name='sentiment') THEN
            ALTER TABLE activities ADD COLUMN sentiment VARCHAR(20) CHECK (sentiment IN ('very_positive', 'positive', 'neutral', 'negative', 'very_negative'));
        END IF;
        
        -- Add follow-up required flag
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='activities' AND column_name='follow_up_required') THEN
            ALTER TABLE activities ADD COLUMN follow_up_required BOOLEAN DEFAULT false;
        END IF;
        
        -- Add follow-up date
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='activities' AND column_name='follow_up_date') THEN
            ALTER TABLE activities ADD COLUMN follow_up_date TIMESTAMP;
        END IF;
        
        -- Add tags
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='activities' AND column_name='tags') THEN
            ALTER TABLE activities ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
        END IF;
        
        -- Add attachments
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='activities' AND column_name='attachments') THEN
            ALTER TABLE activities ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
        END IF;
    END $$;

    -- Activity templates table
    CREATE TABLE IF NOT EXISTS activity_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'sms', 'whatsapp')),
        subject_template TEXT,
        description_template TEXT,
        duration INTEGER,
        is_shared BOOLEAN DEFAULT false,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- =====================================================
    -- 3. CUSTOMER SEGMENTATION
    -- =====================================================

    CREATE TABLE IF NOT EXISTS customer_segments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        segment_type VARCHAR(50) DEFAULT 'manual' CHECK (segment_type IN ('manual', 'dynamic')),
        criteria JSONB DEFAULT '{}'::jsonb,
        color VARCHAR(50) DEFAULT '#3B82F6',
        is_active BOOLEAN DEFAULT true,
        customer_count INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_calculated_at TIMESTAMP
    );

-- Add missing columns to existing customer_segments table
DO $$ 
BEGIN
    -- Add color column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='customer_segments' AND column_name='color') THEN
        ALTER TABLE customer_segments ADD COLUMN color VARCHAR(50) DEFAULT '#3B82F6';
    END IF;
    
    -- Add customer_count column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='customer_segments' AND column_name='customer_count') THEN
        ALTER TABLE customer_segments ADD COLUMN customer_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add last_calculated_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='customer_segments' AND column_name='last_calculated_at') THEN
        ALTER TABLE customer_segments ADD COLUMN last_calculated_at TIMESTAMP;
    END IF;
END $$;

-- Segment members (for manual segments)
CREATE TABLE IF NOT EXISTS segment_members (
    id SERIAL PRIMARY KEY,
    segment_id INTEGER NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(segment_id, customer_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_segment_members_segment ON segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_members_customer ON segment_members(customer_id);

-- =====================================================
-- 4. EMAIL TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    html_body TEXT,
    category VARCHAR(50) CHECK (category IN ('welcome', 'follow_up', 'quote', 'meeting', 'newsletter', 'promotional', 'other')),
    variables JSONB DEFAULT '[]'::jsonb,
    is_shared BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to existing email_templates table
DO $$ 
BEGIN
    -- Add category column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='email_templates' AND column_name='category') THEN
        ALTER TABLE email_templates ADD COLUMN category VARCHAR(50) CHECK (category IN ('welcome', 'follow_up', 'quote', 'meeting', 'newsletter', 'promotional', 'other'));
    END IF;
    
    -- Add variables column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='email_templates' AND column_name='variables') THEN
        ALTER TABLE email_templates ADD COLUMN variables JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add is_shared column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='email_templates' AND column_name='is_shared') THEN
        ALTER TABLE email_templates ADD COLUMN is_shared BOOLEAN DEFAULT false;
    END IF;
    
    -- Add usage_count column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='email_templates' AND column_name='usage_count') THEN
        ALTER TABLE email_templates ADD COLUMN usage_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Template usage tracking
CREATE TABLE IF NOT EXISTS email_template_usage (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES email_templates(id) ON DELETE CASCADE,
    used_by INTEGER REFERENCES users(id),
    customer_id INTEGER REFERENCES customers(id),
    email_tracking_id INTEGER REFERENCES email_tracking(id),
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. WORKFLOW AUTOMATION
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('deal_stage_changed', 'task_created', 'task_completed', 'lead_assigned', 'email_opened', 'email_clicked', 'meeting_scheduled', 'meeting_completed', 'time_based', 'inactivity', 'field_changed')),
    trigger_config JSONB DEFAULT '{}'::jsonb,
    conditions JSONB DEFAULT '[]'::jsonb,
    actions JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT false,
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_executed_at TIMESTAMP
);

    -- Workflow execution logs
    CREATE TABLE IF NOT EXISTS workflow_executions (
        id SERIAL PRIMARY KEY,
        workflow_id INTEGER REFERENCES automation_workflows(id) ON DELETE CASCADE,
        trigger_data JSONB,
        execution_status VARCHAR(50) CHECK (execution_status IN ('success', 'failed', 'partial')),
        actions_executed JSONB DEFAULT '[]'::jsonb,
        error_message TEXT,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(execution_status);

    -- =====================================================
    -- 6. QUOTE ENHANCEMENTS
    -- =====================================================

    -- Quote templates
    CREATE TABLE IF NOT EXISTS quote_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        header_content TEXT,
        footer_content TEXT,
        terms_and_conditions TEXT,
        payment_terms TEXT,
        template_layout VARCHAR(50) DEFAULT 'standard',
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Add template_id to quotes if not exists
    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='quotes' AND column_name='template_id') THEN
            ALTER TABLE quotes ADD COLUMN template_id INTEGER REFERENCES quote_templates(id);
        END IF;
        
        -- Add version number
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='quotes' AND column_name='version') THEN
            ALTER TABLE quotes ADD COLUMN version INTEGER DEFAULT 1;
        END IF;
        
        -- Add parent quote for versioning
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='quotes' AND column_name='parent_quote_id') THEN
            ALTER TABLE quotes ADD COLUMN parent_quote_id INTEGER REFERENCES quotes(id);
        END IF;
        
        -- Add PDF URL
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='quotes' AND column_name='pdf_url') THEN
            ALTER TABLE quotes ADD COLUMN pdf_url TEXT;
        END IF;
        
        -- Add approval status
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='quotes' AND column_name='approval_status') THEN
            ALTER TABLE quotes ADD COLUMN approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
        END IF;
        
        -- Add approved by
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='quotes' AND column_name='approved_by') THEN
            ALTER TABLE quotes ADD COLUMN approved_by INTEGER REFERENCES users(id);
        END IF;
        
        -- Add approved at
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='quotes' AND column_name='approved_at') THEN
            ALTER TABLE quotes ADD COLUMN approved_at TIMESTAMP;
        END IF;
    END $$;

    -- Quote approval history
    CREATE TABLE IF NOT EXISTS quote_approvals (
        id SERIAL PRIMARY KEY,
        quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
        approver_id INTEGER REFERENCES users(id),
        status VARCHAR(50) CHECK (status IN ('approved', 'rejected')),
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- =====================================================
    -- 7. SALES FORECASTING
    -- =====================================================

    -- Forecast snapshots table
    CREATE TABLE IF NOT EXISTS sales_forecasts (
        id SERIAL PRIMARY KEY,
        forecast_period VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        forecast_type VARCHAR(50) CHECK (forecast_type IN ('weighted_pipeline', 'historical_trend', 'quota_based', 'best_case', 'most_likely', 'worst_case')),
        forecast_amount DECIMAL(15,2) NOT NULL,
        actual_amount DECIMAL(15,2),
        accuracy_percentage DECIMAL(5,2),
        deal_count INTEGER,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- User/Team quotas
    CREATE TABLE IF NOT EXISTS sales_quotas (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        team_id INTEGER REFERENCES sales_teams(id),
        quota_period VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        quota_amount DECIMAL(15,2) NOT NULL,
        actual_amount DECIMAL(15,2) DEFAULT 0,
        attainment_percentage DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK ((user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL))
    );

    CREATE INDEX IF NOT EXISTS idx_sales_quotas_user ON sales_quotas(user_id);
    CREATE INDEX IF NOT EXISTS idx_sales_quotas_team ON sales_quotas(team_id);
    CREATE INDEX IF NOT EXISTS idx_sales_quotas_period ON sales_quotas(start_date, end_date);

    -- =====================================================
    -- UPDATE TRIGGERS FOR TIMESTAMPS
    -- =====================================================

    -- Function to update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Apply triggers to all new tables (guarded for re-runs)
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_custom_deal_stages_updated_at') THEN
            CREATE TRIGGER update_custom_deal_stages_updated_at BEFORE UPDATE ON custom_deal_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sales_pipelines_updated_at') THEN
            CREATE TRIGGER update_sales_pipelines_updated_at BEFORE UPDATE ON sales_pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_activity_templates_updated_at') THEN
            CREATE TRIGGER update_activity_templates_updated_at BEFORE UPDATE ON activity_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_customer_segments_updated_at') THEN
            CREATE TRIGGER update_customer_segments_updated_at BEFORE UPDATE ON customer_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_email_templates_updated_at') THEN
            CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_automation_workflows_updated_at') THEN
            CREATE TRIGGER update_automation_workflows_updated_at BEFORE UPDATE ON automation_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quote_templates_updated_at') THEN
            CREATE TRIGGER update_quote_templates_updated_at BEFORE UPDATE ON quote_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sales_quotas_updated_at') THEN
            CREATE TRIGGER update_sales_quotas_updated_at BEFORE UPDATE ON sales_quotas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
    END $$;

    -- =====================================================
    -- INSERT SAMPLE DATA
    -- =====================================================

    -- Insert default quote template
    INSERT INTO quote_templates (name, description, header_content, footer_content, terms_and_conditions, payment_terms, is_default, is_active)
    VALUES (
        'Standard Quote Template',
        'Default template for all quotes',
        'Thank you for your interest in our products and services.',
        'We look forward to doing business with you.',
        '1. This quote is valid for 30 days from the issue date.
    2. Prices are subject to change without notice.
    3. All sales are final unless otherwise specified.',
        'Payment due within 30 days of invoice date. We accept bank transfer, credit card, and check.',
        true,
        true
    ) ON CONFLICT DO NOTHING;

    -- Insert sample email templates
    INSERT INTO email_templates (name, subject, body, category, variables, is_shared, is_active)
    VALUES 
        ('Welcome Email', 
        'Welcome to {{company_name}}!', 
        'Dear {{customer_name}},\n\nThank you for choosing {{company_name}}. We are excited to have you as our customer.\n\nBest regards,\n{{sales_rep_name}}',
        'welcome',
        '["customer_name", "company_name", "sales_rep_name"]'::jsonb,
        true,
        true),
        ('Follow-up Email',
        'Following up on our conversation',
        'Hi {{customer_name}},\n\nI wanted to follow up on our recent conversation about {{deal_name}}. Do you have any questions or would you like to schedule another meeting?\n\nBest regards,\n{{sales_rep_name}}',
        'follow_up',
        '["customer_name", "deal_name", "sales_rep_name"]'::jsonb,
        true,
        true),
        ('Quote Email',
        'Quote #{{quote_number}} for your review',
        'Dear {{customer_name}},\n\nPlease find attached quote #{{quote_number}} for your review. This quote is valid until {{valid_until}}.\n\nIf you have any questions, please don''t hesitate to contact me.\n\nBest regards,\n{{sales_rep_name}}',
        'quote',
        '["customer_name", "quote_number", "valid_until", "sales_rep_name"]'::jsonb,
        true,
        true)
    ON CONFLICT DO NOTHING;

    -- Insert sample activity templates
    INSERT INTO activity_templates (name, activity_type, subject_template, description_template, duration, is_shared)
    VALUES 
        ('Discovery Call', 'call', 'Discovery call with {{customer_name}}', 'Initial discovery call to understand customer needs and pain points.', 30, true),
        ('Demo Presentation', 'meeting', 'Product demo for {{customer_name}}', 'Product demonstration and Q&A session.', 60, true),
        ('Follow-up Call', 'call', 'Follow-up with {{customer_name}}', 'Check in on customer and address any questions or concerns.', 15, true),
        ('Contract Review', 'meeting', 'Contract review with {{customer_name}}', 'Review contract terms and address any questions.', 45, true)
    ON CONFLICT DO NOTHING;

    -- =====================================================
    -- COMPLETED
    -- =====================================================

    -- Migration completed successfully
    SELECT 'Phase 1 CRM Enhancements Migration Completed Successfully!' as status;
