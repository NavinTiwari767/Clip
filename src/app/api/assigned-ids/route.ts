import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied: Only Admin can assign IDs' }, { status: 403 });
    }

    const { person_id, id_value, notes } = await request.json();
    const cleanId = (id_value || '').trim();
    if (!person_id || !cleanId) {
      return NextResponse.json({ error: 'Person ID and ID Value are required' }, { status: 400 });
    }

    const res = await pool.query(
      `INSERT INTO assigned_ids (person_id, id_value, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
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
