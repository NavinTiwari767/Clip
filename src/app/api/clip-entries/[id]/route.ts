import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PUT: Admin-only manipulation (edit clip count and/or entry date)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Permission denied: Only Admin can edit or manipulate clip records' },
        { status: 403 }
      );
    }

    const { clips, entry_date } = await request.json();
    const count = parseInt(clips, 10);

    if (isNaN(count) || count < 0) {
      return NextResponse.json(
        { error: 'Clips count must be 0 or greater' },
        { status: 400 }
      );
    }

    let res;
    if (entry_date) {
      res = await pool.query(
        `UPDATE clip_entries
         SET clips = $1, entry_date = $2, updated_at = now()
         WHERE id = $3
         RETURNING *;`,
        [count, entry_date, params.id]
      );
    } else {
      res = await pool.query(
        `UPDATE clip_entries
         SET clips = $1, updated_at = now()
         WHERE id = $2
         RETURNING *;`,
        [count, params.id]
      );
    }

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Clip entry not found' }, { status: 404 });
    }

    return NextResponse.json({ entry: res.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'Another entry already exists for this ID on the selected date' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Admin-only deletion of clip records
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Permission denied: Only Admin can delete clip entries' },
        { status: 403 }
      );
    }

    await pool.query('DELETE FROM clip_entries WHERE id = $1', [params.id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
