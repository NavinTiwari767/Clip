import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied: Only Admin can edit assigned IDs' }, { status: 403 });
    }

    const { id_value, notes } = await request.json();
    const cleanId = (id_value || '').trim();
    if (!cleanId) {
      return NextResponse.json({ error: 'ID value cannot be empty' }, { status: 400 });
    }

    const res = await pool.query(
      `UPDATE assigned_ids 
       SET id_value = $1, notes = $2
       WHERE id = $3
       RETURNING *`,
      [cleanId, notes !== undefined ? (notes?.trim() || null) : null, params.id]
    );

    return NextResponse.json({ assigned_id: res.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json({ error: 'This ID value already exists for this person' }, { status: 400 });
    }
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
      return NextResponse.json({ error: 'Permission denied: Only Admin can delete assigned IDs' }, { status: 403 });
    }

    await pool.query('DELETE FROM assigned_ids WHERE id = $1', [params.id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
