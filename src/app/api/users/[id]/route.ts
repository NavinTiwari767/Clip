import { NextRequest, NextResponse } from 'next/server';
import { pool, hashPassword } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied: Only Admin can delete users' }, { status: 403 });
    }

    if (session.id === params.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    await pool.query('DELETE FROM app_users WHERE id = $1', [params.id]);
    return NextResponse.json({ success: true });
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
      return NextResponse.json({ error: 'Permission denied: Only Admin can update users' }, { status: 403 });
    }

    const { password, role, full_name } = await request.json();

    if (password) {
      const passwordHash = hashPassword(password.trim());
      await pool.query('UPDATE app_users SET password_hash = $1 WHERE id = $2', [passwordHash, params.id]);
    }

    if (role) {
      const cleanRole = role === 'admin' ? 'admin' : 'user';
      await pool.query('UPDATE app_users SET role = $1 WHERE id = $2', [cleanRole, params.id]);
    }

    if (full_name !== undefined) {
      await pool.query('UPDATE app_users SET full_name = $1 WHERE id = $2', [full_name.trim(), params.id]);
    }

    const updated = await pool.query(
      'SELECT id, email, full_name, role, created_at FROM app_users WHERE id = $1',
      [params.id]
    );

    return NextResponse.json({ user: updated.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
