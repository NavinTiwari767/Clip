import { NextRequest, NextResponse } from 'next/server';
import { pool, hashPassword } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

    // Query assigned_ids with total clips
    const idsRes = await pool.query(
      `SELECT 
        ai.id,
        ai.person_id,
        ai.id_value,
        ai.notes,
        ai.created_at,
        COALESCE(SUM(ce.clips), 0)::int AS total_clips
      FROM assigned_ids ai
      LEFT JOIN clip_entries ce ON ai.id = ce.assigned_id
      WHERE ai.person_id = $1
      GROUP BY ai.id, ai.person_id, ai.id_value, ai.notes, ai.created_at
      ORDER BY total_clips DESC, ai.id_value ASC;`,
      [personId]
    );

    const totalClips = idsRes.rows.reduce((sum, idObj) => sum + (idObj.total_clips || 0), 0);

    return NextResponse.json({
      person: {
        ...pRes.rows[0],
        total_clips: totalClips,
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
      return NextResponse.json({ error: 'Permission denied: Only Admin can edit members' }, { status: 403 });
    }

    const { name, email, password } = await request.json();
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanName) {
      return NextResponse.json({ error: 'Member name cannot be empty' }, { status: 400 });
    }

    // Check existing person
    const personRes = await pool.query('SELECT * FROM people WHERE id = $1', [params.id]);
    if (personRes.rowCount === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    const currentPerson = personRes.rows[0];

    let userId = currentPerson.user_id;

    // If password or email provided, update/create app_users
    if (cleanEmail) {
      if (userId) {
        if (password && password.trim()) {
          const passHash = hashPassword(password.trim());
          await pool.query(
            'UPDATE app_users SET email = $1, full_name = $2, password_hash = $3 WHERE id = $4',
            [cleanEmail, cleanName, passHash, userId]
          );
        } else {
          await pool.query(
            'UPDATE app_users SET email = $1, full_name = $2 WHERE id = $3',
            [cleanEmail, cleanName, userId]
          );
        }
      } else {
        const passHash = hashPassword(password?.trim() || 'member123');
        const newUserRes = await pool.query(`
          INSERT INTO app_users (email, password_hash, role, full_name)
          VALUES ($1, $2, 'user', $3)
          ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
          RETURNING id;
        `, [cleanEmail, passHash, cleanName]);
        userId = newUserRes.rows[0].id;
      }
    }

    const res = await pool.query(
      'UPDATE people SET name = $1, email = $2, user_id = $3 WHERE id = $4 RETURNING *',
      [cleanName, cleanEmail || null, userId, params.id]
    );

    return NextResponse.json({ person: res.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
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
      return NextResponse.json({ error: 'Permission denied: Only Admin can delete members' }, { status: 403 });
    }

    const pRes = await pool.query('SELECT user_id FROM people WHERE id = $1', [params.id]);
    const userId = pRes.rows[0]?.user_id;

    await pool.query('DELETE FROM people WHERE id = $1', [params.id]);
    if (userId) {
      await pool.query('DELETE FROM app_users WHERE id = $1', [userId]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
