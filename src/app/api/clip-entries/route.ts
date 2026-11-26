import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET entries by date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    if (!dateStr) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }

    const res = await pool.query(
      `SELECT 
        ce.id AS entry_id,
        ce.entry_date::text AS entry_date,
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
      JOIN people p ON ai.person_id = p.id
      WHERE ce.entry_date = $1
      ORDER BY ce.clips DESC;`,
      [dateStr]
    );

    return NextResponse.json({ entries: res.rows });
  } catch (err: any) {
    console.error('Error fetching clip entries:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST upsert clip entry (Accessible to BOTH Admin and User! User adds their clips)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { assigned_id, entry_date, clips } = await request.json();
    const count = parseInt(clips, 10);
    if (!assigned_id || !entry_date || isNaN(count) || count < 0) {
      return NextResponse.json({ error: 'Valid assigned_id, entry_date and non-negative clips required' }, { status: 400 });
    }

    // If regular user (non-admin), check if this is an update on an existing entry:
    // Prompt: "user apna clipwager add kar skta hai and sab kuch dekh bhi skta hai only but admin uske edit,delecdet and pura crud karta hai"
    // So if an entry already exists and clips value is changing, non-admin shouldn't overwrite unless they are initially adding it
    const existingRes = await pool.query(
      'SELECT id FROM clip_entries WHERE assigned_id = $1 AND entry_date = $2',
      [assigned_id, entry_date]
    );

    if (existingRes.rowCount && existingRes.rowCount > 0 && session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Permission denied: An entry already exists for this ID on this date. Only Admin can edit existing records.' },
        { status: 403 }
      );
    }

    const res = await pool.query(
      `INSERT INTO clip_entries (assigned_id, entry_date, clips)
       VALUES ($1, $2, $3)
       ON CONFLICT (assigned_id, entry_date)
       DO UPDATE SET clips = EXCLUDED.clips, updated_at = now()
       RETURNING *;`,
      [assigned_id, entry_date, count]
    );

    return NextResponse.json({ entry: res.rows[0] });
  } catch (err: any) {
    console.error('Error upserting clip entry:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
