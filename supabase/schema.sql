-- ==============================================================================
-- CLIP TRACKING APPLICATION - COMPLETE SUPABASE SCHEMA & SECURITY CONFIGURATION
-- ==============================================================================

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing tables if re-running (safe order)
-- DROP TABLE IF EXISTS clip_entries CASCADE;
-- DROP TABLE IF EXISTS assigned_ids CASCADE;
-- DROP TABLE IF EXISTS people CASCADE;

-- ==============================================================================
-- TABLE: people
-- Represents an individual whose assigned IDs and clip counts are tracked.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- TABLE: assigned_ids
-- Represents specific IDs assigned to a person (e.g., ID 2, ID 4, ID 50 for Rahul).
-- Multiple IDs can be assigned to one person.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS assigned_ids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    id_value TEXT NOT NULL CHECK (char_length(trim(id_value)) > 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Prevent assigning the exact same ID value twice to the same person
    CONSTRAINT uq_person_id_value UNIQUE (person_id, id_value)
);

-- ==============================================================================
-- TABLE: clip_entries
-- Daily clip count records. One record per assigned_id per date.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS clip_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_id UUID NOT NULL REFERENCES assigned_ids(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    clips INTEGER NOT NULL DEFAULT 0 CHECK (clips >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Unique constraint: prevent duplicate daily entries for the same assigned ID
    CONSTRAINT uq_assigned_id_entry_date UNIQUE (assigned_id, entry_date)
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERIES & REPORTING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_assigned_ids_person_id ON assigned_ids(person_id);
CREATE INDEX IF NOT EXISTS idx_clip_entries_assigned_id ON clip_entries(assigned_id);
CREATE INDEX IF NOT EXISTS idx_clip_entries_entry_date ON clip_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_clip_entries_composite ON clip_entries(assigned_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_clip_entries_date_range ON clip_entries(entry_date DESC, clips DESC);

-- ==============================================================================
-- AUTOMATIC TIMESTAMP TRIGGER
-- Updates 'updated_at' on clip_entries when a record is modified
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clip_entries_updated_at ON clip_entries;
CREATE TRIGGER trigger_clip_entries_updated_at
    BEFORE UPDATE ON clip_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Only authenticated admin users can view, insert, update, and delete records.
-- Public unauthenticated access is completely rejected.
-- ==============================================================================

ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE assigned_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE clip_entries ENABLE ROW LEVEL SECURITY;

-- 1. people policies
DROP POLICY IF EXISTS "Admin full access on people" ON people;
CREATE POLICY "Admin full access on people"
    ON people
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. assigned_ids policies
DROP POLICY IF EXISTS "Admin full access on assigned_ids" ON assigned_ids;
CREATE POLICY "Admin full access on assigned_ids"
    ON assigned_ids
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. clip_entries policies
DROP POLICY IF EXISTS "Admin full access on clip_entries" ON clip_entries;
CREATE POLICY "Admin full access on clip_entries"
    ON clip_entries
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- HELPER VIEWS FOR EFFICIENT DASHBOARD & REPORTING
-- ==============================================================================
CREATE OR REPLACE VIEW v_clip_entries_detail AS
SELECT 
    ce.id AS entry_id,
    ce.entry_date,
    ce.clips,
    ce.created_at AS entry_created_at,
    ce.updated_at AS entry_updated_at,
    ai.id AS assigned_id,
    ai.id_value,
    ai.notes AS id_notes,
    p.id AS person_id,
    p.name AS person_name
FROM clip_entries ce
JOIN assigned_ids ai ON ce.assigned_id = ai.id
JOIN people p ON ai.person_id = p.id;

-- Grant permissions to authenticated role for views
GRANT SELECT ON v_clip_entries_detail TO authenticated;

