import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const peopleRes = await pool.query('SELECT * FROM people ORDER BY name ASC');
    const idsRes = await pool.query('SELECT * FROM assigned_ids ORDER BY id_value ASC');

    const people = peopleRes.rows.map((p) => ({
      ...p,
      assigned_ids: idsRes.rows.filter((id) => id.person_id === p.id),
    }));

    return NextResponse.json({ people });
  } catch (err: any) {
    console.error('Error in GET /api/people:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied: Only Admin can add people' }, { status: 403 });
    }

    const { name } = await request.json();
    const cleanName = (name || '').trim();
    if (!cleanName) {
      return NextResponse.json({ error: 'Person name is required' }, { status: 400 });
    }

    const res = await pool.query(
      'INSERT INTO people (name) VALUES ($1) RETURNING *',
      [cleanName]
    );

    return NextResponse.json({ person: res.rows[0] });
  } catch (err: any) {
    console.error('Error in POST /api/people:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
