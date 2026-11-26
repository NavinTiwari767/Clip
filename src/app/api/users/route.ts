import { NextRequest, NextResponse } from 'next/server';
import { pool, hashPassword } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied: Only Admin can view user accounts' }, { status: 403 });
    }

    const res = await pool.query(
      'SELECT id, email, full_name, role, created_at FROM app_users ORDER BY role ASC, email ASC'
    );
    return NextResponse.json({ users: res.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied: Only Admin can add members' }, { status: 403 });
    }

    const { email, password, full_name, role } = await request.json();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    const cleanRole = role === 'admin' ? 'admin' : 'user';

    if (!cleanEmail || !cleanPass) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const passwordHash = hashPassword(cleanPass);

    const res = await pool.query(
      `INSERT INTO app_users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role, created_at`,
      [cleanEmail, passwordHash, full_name?.trim() || cleanEmail.split('@')[0], cleanRole]
    );

    return NextResponse.json({ user: res.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json({ error: 'A user with this email address already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
