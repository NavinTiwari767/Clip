import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET entries by date
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

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
      ORDER BY p.name ASC, ce.clips DESC;`,
      [dateStr]
    );

    return NextResponse.json({ entries: res.rows });
  } catch (err: any) {
    console.error('Error fetching clip entries:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Members add daily clips for their assigned IDs.
// Admins ONLY assign IDs and edit/delete existing clips (they do not add new daily clips).
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (session.role === 'admin') {
      return NextResponse.json(
        {
          error:
            'Admins only assign IDs and edit/delete existing clip records. Only members submit daily clip entries.',
        },
        { status: 403 }
      );
    }

    const { assigned_id, entry_date, clips } = await request.json();
    const count = parseInt(clips, 10);
    if (!assigned_id || !entry_date || isNaN(count) || count < 0) {
      return NextResponse.json(
        { error: 'Valid assigned_id, entry_date and non-negative clips required' },
        { status: 400 }
      );
    }

    // Verify that the assigned_id belongs to the logged-in member
    const ownershipRes = await pool.query(
      `SELECT ai.id
       FROM assigned_ids ai
       JOIN people p ON ai.person_id = p.id
       WHERE ai.id = $1 AND (LOWER(p.email) = LOWER($2) OR p.user_id = $3)`,
      [assigned_id, session.email, session.id]
    );

    if (!ownershipRes.rowCount || ownershipRes.rowCount === 0) {
      return NextResponse.json(
        { error: 'Permission denied: You can only add clips for your own assigned IDs.' },
        { status: 403 }
      );
    }

    // Check if an entry already exists for this assigned_id + date (members cannot edit existing entries)
    const existingRes = await pool.query(
      'SELECT id FROM clip_entries WHERE assigned_id = $1 AND entry_date = $2',
      [assigned_id, entry_date]
    );

    if (existingRes.rowCount && existingRes.rowCount > 0) {
      return NextResponse.json(
        {
          error:
            'An entry already exists for this ID on this date. Only Admin can edit or manipulate existing records.',
        },
        { status: 403 }
      );
    }

    const res = await pool.query(
      `INSERT INTO clip_entries (assigned_id, entry_date, clips)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [assigned_id, entry_date, count]
    );

    return NextResponse.json({ entry: res.rows[0] });
  } catch (err: any) {
    console.error('Error creating clip entry:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
