import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied: Only Admin can assign IDs' }, { status: 403 });
    }

    const { person_id, id_value, notes, bulk_ids } = await request.json();

    if (!person_id) {
      return NextResponse.json({ error: 'Person ID is required' }, { status: 400 });
    }

    // Bulk ID assignment in 1 single SQL query
    if (bulk_ids && typeof bulk_ids === 'string') {
      const idList = Array.from(
        new Set(
          bulk_ids
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        )
      );

      if (idList.length === 0) {
        return NextResponse.json({ error: 'No valid IDs provided in bulk input' }, { status: 400 });
      }

      const res = await pool.query(
        `INSERT INTO assigned_ids (person_id, id_value, notes)
         SELECT $1::uuid, val, $3
         FROM UNNEST($2::text[]) AS val
         ON CONFLICT (person_id, id_value) DO NOTHING
         RETURNING *;`,
        [person_id, idList, notes?.trim() || null]
      );

      return NextResponse.json({
        success: true,
        count: res.rowCount,
        assigned_ids: res.rows,
      });
    }

    // Single ID entry
    const cleanId = (id_value || '').trim();
    if (!cleanId) {
      return NextResponse.json({ error: 'ID Value is required' }, { status: 400 });
    }

    const res = await pool.query(
      `INSERT INTO assigned_ids (person_id, id_value, notes)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [person_id, cleanId, notes?.trim() || null]
    );

    return NextResponse.json({ assigned_id: res.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json({ error: 'This ID is already assigned to this person' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
