import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const personId = params.id;
    const pRes = await pool.query('SELECT * FROM people WHERE id = $1', [personId]);
    if (pRes.rowCount === 0) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    const idsRes = await pool.query(
      'SELECT * FROM assigned_ids WHERE person_id = $1 ORDER BY id_value ASC',
      [personId]
    );

    return NextResponse.json({
      person: {
        ...pRes.rows[0],
        assigned_ids: idsRes.rows,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied: Only Admin can edit people' }, { status: 403 });
    }

    const { name } = await request.json();
    const cleanName = (name || '').trim();
    if (!cleanName) {
      return NextResponse.json({ error: 'Person name cannot be empty' }, { status: 400 });
    }

    const res = await pool.query(
      'UPDATE people SET name = $1 WHERE id = $2 RETURNING *',
      [cleanName, params.id]
    );

    return NextResponse.json({ person: res.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied: Only Admin can delete people' }, { status: 403 });
    }

    await pool.query('DELETE FROM people WHERE id = $1', [params.id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
