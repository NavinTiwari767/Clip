-- ==============================================================================
-- SEED DATA FOR CLIP TRACKING APPLICATION
-- Populates example data (Rahul & Amit with assigned IDs and November 2026 entries)
-- ==============================================================================

DO $$
DECLARE
    v_rahul_id UUID;
    v_amit_id UUID;
    
    v_rahul_id_2 UUID;
    v_rahul_id_4 UUID;
    v_rahul_id_50 UUID;
    
    v_amit_id_10 UUID;
    v_amit_id_15 UUID;
BEGIN
    -- 1. Insert Rahul
    INSERT INTO people (name) VALUES ('Rahul') RETURNING id INTO v_rahul_id;
    
    -- Insert Rahul's IDs: 2, 4, 50
    INSERT INTO assigned_ids (person_id, id_value, notes)
    VALUES (v_rahul_id, '2', 'Primary batch')
    RETURNING id INTO v_rahul_id_2;

    INSERT INTO assigned_ids (person_id, id_value, notes)
    VALUES (v_rahul_id, '4', 'Secondary queue')
    RETURNING id INTO v_rahul_id_4;

    INSERT INTO assigned_ids (person_id, id_value, notes)
    VALUES (v_rahul_id, '50', 'Bulk reserve')
    RETURNING id INTO v_rahul_id_50;

    -- 2. Insert Amit
    INSERT INTO people (name) VALUES ('Amit') RETURNING id INTO v_amit_id;
    
    -- Insert Amit's IDs: 10, 15
    INSERT INTO assigned_ids (person_id, id_value, notes)
    VALUES (v_amit_id, '10', 'Main line')
    RETURNING id INTO v_amit_id_10;

    INSERT INTO assigned_ids (person_id, id_value, notes)
    VALUES (v_amit_id, '15', 'Shift B')
    RETURNING id INTO v_amit_id_15;

    -- 3. Insert Sample Entries for 26 November 2026 (from prompt requirements)
    INSERT INTO clip_entries (assigned_id, entry_date, clips)
    VALUES 
        (v_rahul_id_2, '2026-11-26', 20),
        (v_rahul_id_4, '2026-11-26', 15),
        (v_rahul_id_50, '2026-11-26', 30),
        (v_amit_id_10, '2026-11-26', 25)
    ON CONFLICT (assigned_id, entry_date) DO UPDATE 
    SET clips = EXCLUDED.clips;

    -- Additional sample entries for November 2026 to provide rich charts
    INSERT INTO clip_entries (assigned_id, entry_date, clips)
    VALUES 
        (v_rahul_id_2, '2026-11-24', 25),
        (v_rahul_id_4, '2026-11-24', 18),
        (v_amit_id_10, '2026-11-24', 30),
        (v_amit_id_15, '2026-11-24', 22),
        (v_rahul_id_2, '2026-11-25', 28),
        (v_rahul_id_50, '2026-11-25', 35),
        (v_amit_id_10, '2026-11-25', 20),
        (v_amit_id_15, '2026-11-25', 25)
    ON CONFLICT (assigned_id, entry_date) DO NOTHING;

END $$;
