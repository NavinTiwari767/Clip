import { NextRequest, NextResponse } from 'next/server';
import { pool, hashPassword } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [peopleRes, idsRes] = await Promise.all([
      pool.query('SELECT * FROM people ORDER BY name ASC'),
      pool.query(`
        SELECT 
          ai.id,
          ai.person_id,
          ai.id_value,
          ai.notes,
          ai.created_at,
          COALESCE(SUM(ce.clips), 0)::int AS total_clips
        FROM assigned_ids ai
        LEFT JOIN clip_entries ce ON ai.id = ce.assigned_id
        GROUP BY ai.id, ai.person_id, ai.id_value, ai.notes, ai.created_at
        ORDER BY total_clips DESC, ai.id_value ASC
      `),
    ]);

    const idsByPerson = new Map<string, any[]>();
    idsRes.rows.forEach((idRow) => {
      if (!idsByPerson.has(idRow.person_id)) {
        idsByPerson.set(idRow.person_id, []);
      }
      idsByPerson.get(idRow.person_id)!.push(idRow);
    });

    const people = peopleRes.rows.map((p) => {
      const personIds = idsByPerson.get(p.id) || [];
      const personTotalClips = personIds.reduce((sum, idObj) => sum + (idObj.total_clips || 0), 0);
      return {
        ...p,
        total_clips: personTotalClips,
        assigned_ids: personIds,
      };
    });

    return NextResponse.json({ people });
  } catch (err: any) {
    console.error('Error in GET /api/people:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Admin creates a new member with login email and password
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session?.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied: Only Admin can add members' }, { status: 403 });
    }

    const { name, email, password } = await request.json();
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanName) {
      return NextResponse.json({ error: 'Member name is required' }, { status: 400 });
    }

    let userId: string | null = null;

    if (cleanEmail) {
      const userPassword = cleanPassword || 'member123';
      const passwordHash = hashPassword(userPassword);

      const userRes = await pool.query(
        `INSERT INTO app_users (email, password_hash, role, full_name)
         VALUES ($1, $2, 'user', $3)
         ON CONFLICT (email) DO UPDATE 
         SET full_name = EXCLUDED.full_name
         RETURNING id;`,
        [cleanEmail, passwordHash, cleanName]
      );

      userId = userRes.rows[0].id;
    }

    const res = await pool.query(
      `INSERT INTO people (name, email, user_id)
       VALUES ($1, $2, $3)
       RETURNING *;`,
      [cleanName, cleanEmail || null, userId]
    );

    return NextResponse.json({ person: res.rows[0] });
  } catch (err: any) {
    console.error('Error in POST /api/people:', err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'A member with this email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
