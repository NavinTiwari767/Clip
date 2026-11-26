import { NextRequest, NextResponse } from 'next/server';
import { pool, isAdminEmail, verifyPassword, hashPassword } from '@/lib/db';
import { setSession, SessionUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = isAdminEmail(cleanEmail);

    // Query user from app_users
    const userRes = await pool.query('SELECT * FROM app_users WHERE email = $1', [cleanEmail]);
    let user = userRes.rows[0];

    // If admin email not found in app_users, initialize it automatically
    if (!user && isAdmin) {
      const defaultHash = hashPassword('admin');
      const insertRes = await pool.query(
        `INSERT INTO app_users (email, password_hash, role, full_name)
         VALUES ($1, $2, 'admin', $3)
         RETURNING *`,
        [cleanEmail, defaultHash, cleanEmail.split('@')[0]]
      );
      user = insertRes.rows[0];
    }

    // If still no user, or password check fails
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isMatch = verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const role = isAdmin || user.role === 'admin' ? 'admin' : 'user';
    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      role,
      full_name: user.full_name,
    };

    await setSession(sessionUser);

    return NextResponse.json({
      success: true,
      user: sessionUser,
    });
  } catch (err: any) {
    console.error('Login API error:', err);
    return NextResponse.json({ error: err.message || 'Authentication failed' }, { status: 500 });
  }
}
