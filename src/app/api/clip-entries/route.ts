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

// POST: Members add daily clips (supports single item or batch array in 1 round-trip!)
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

    const body = await request.json();
    const items: { assigned_id: string; entry_date: string; clips: number }[] = Array.isArray(
      body.entries
    )
      ? body.entries
      : [{ assigned_id: body.assigned_id, entry_date: body.entry_date, clips: body.clips }];

    const cleaned = items
      .map((item) => ({
        assigned_id: item.assigned_id,
        entry_date: item.entry_date,
        clips: parseInt(String(item.clips), 10),
      }))
      .filter((item) => item.assigned_id && item.entry_date && !isNaN(item.clips) && item.clips >= 0);

    if (cleaned.length === 0) {
      return NextResponse.json(
        { error: 'Valid assigned_id, entry_date and non-negative clips required' },
        { status: 400 }
      );
    }

    const assignedIds = Array.from(new Set(cleaned.map((i) => i.assigned_id)));
    const entryDates = cleaned.map((i) => i.entry_date);

    // Single parallel check for ownership AND existing records
    const [ownedRes, existingRes] = await Promise.all([
      pool.query(
        `SELECT ai.id
         FROM assigned_ids ai
         JOIN people p ON ai.person_id = p.id
         WHERE ai.id = ANY($1::uuid[]) AND (LOWER(p.email) = LOWER($2) OR p.user_id = $3)`,
        [assignedIds, session.email, session.id]
      ),
      pool.query(
        `SELECT assigned_id, entry_date::text
         FROM clip_entries
         WHERE assigned_id = ANY($1::uuid[]) AND entry_date = ANY($2::date[])`,
        [assignedIds, entryDates]
      ),
    ]);

    const ownedSet = new Set(ownedRes.rows.map((r) => r.id));
    for (const item of cleaned) {
      if (!ownedSet.has(item.assigned_id)) {
        return NextResponse.json(
          { error: 'Permission denied: You can only add clips for your own assigned IDs.' },
          { status: 403 }
        );
      }
    }

    const existingSet = new Set(existingRes.rows.map((r) => `${r.assigned_id}_${r.entry_date}`));
    for (const item of cleaned) {
      if (existingSet.has(`${item.assigned_id}_${item.entry_date}`)) {
        return NextResponse.json(
          {
            error:
              'An entry already exists for one of these IDs on this date. Only Admin can edit existing records.',
          },
          { status: 403 }
        );
      }
    }

    // Batch insert all entries in 1 single query
    const res = await pool.query(
      `INSERT INTO clip_entries (assigned_id, entry_date, clips)
       SELECT * FROM UNNEST($1::uuid[], $2::date[], $3::int[])
       RETURNING *;`,
      [
        cleaned.map((i) => i.assigned_id),
        cleaned.map((i) => i.entry_date),
        cleaned.map((i) => i.clips),
      ]
    );

    return NextResponse.json({
      entry: res.rows[0],
      entries: res.rows,
    });
  } catch (err: any) {
    console.error('Error creating clip entry:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
