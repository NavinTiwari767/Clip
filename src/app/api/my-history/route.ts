import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { format, subDays, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedDays = parseInt(searchParams.get('days') || '12', 10);
    const requestedPersonId = searchParams.get('personId');

    const isAdmin = session.role === 'admin';
    let allPeople: { id: string; name: string; email?: string | null }[] = [];

    if (isAdmin) {
      const allRes = await pool.query('SELECT id, name, email FROM people ORDER BY name ASC');
      allPeople = allRes.rows;
    }

    // 1. Resolve which person's history to fetch
    let targetPersonId: string | null = null;
    let targetPersonName = session.full_name || session.email;

    if (isAdmin) {
      if (requestedPersonId) {
        const match = allPeople.find((p) => p.id === requestedPersonId);
        if (match) {
          targetPersonId = match.id;
          targetPersonName = match.name;
        }
      }
      if (!targetPersonId && allPeople.length > 0) {
        targetPersonId = allPeople[0].id;
        targetPersonName = allPeople[0].name;
      }
    } else {
      // Regular user can ONLY view their own person record
      const pRes = await pool.query(
        'SELECT id, name, email FROM people WHERE LOWER(email) = LOWER($1) OR user_id = $2',
        [session.email, session.id]
      );
      if (pRes.rows.length > 0) {
        targetPersonId = pRes.rows[0].id;
        targetPersonName = pRes.rows[0].name;
      }
    }

    if (!targetPersonId) {
      return NextResponse.json({
        person_name: targetPersonName,
        person_id: '',
        total_clips: 0,
        days_count: requestedDays,
        all_people: allPeople,
        id_summaries: [],
        daily_records: [],
      });
    }

    // 2. Date range calculation: today down to (requestedDays - 1) days ago
    const today = new Date();
    const startDate = format(subDays(today, requestedDays - 1), 'yyyy-MM-dd');
    const endDate = format(today, 'yyyy-MM-dd');

    // 3. Fetch all assigned IDs for this person with all-time total clips
    const assignedIdsRes = await pool.query(`
      SELECT 
        ai.id AS assigned_id,
        ai.id_value,
        ai.notes,
        COALESCE(SUM(ce.clips), 0)::int AS total_clips
      FROM assigned_ids ai
      LEFT JOIN clip_entries ce ON ai.id = ce.assigned_id
      WHERE ai.person_id = $1
      GROUP BY ai.id, ai.id_value, ai.notes
      ORDER BY total_clips DESC, ai.id_value ASC;
    `, [targetPersonId]);

    // 4. Fetch daily clip entries for this person in the last N days
    const entriesRes = await pool.query(`
      SELECT 
        ce.id AS entry_id,
        ce.entry_date::text AS entry_date,
        ce.clips,
        ce.created_at,
        ce.updated_at,
        ai.id AS assigned_id,
        ai.id_value,
        ai.notes AS id_notes
      FROM clip_entries ce
      JOIN assigned_ids ai ON ce.assigned_id = ai.id
      WHERE ai.person_id = $1
        AND ce.entry_date >= $2
        AND ce.entry_date <= $3
      ORDER BY ce.entry_date DESC, ai.id_value ASC;
    `, [targetPersonId, startDate, endDate]);

    // 5. Structure into daily records (day-by-day for the past N days)
    const dailyMap = new Map<string, { total: number; entries: any[] }>();

    for (let i = 0; i < requestedDays; i++) {
      const d = format(subDays(today, i), 'yyyy-MM-dd');
      dailyMap.set(d, { total: 0, entries: [] });
    }

    let rangeTotalClips = 0;
    entriesRes.rows.forEach((row) => {
      if (dailyMap.has(row.entry_date)) {
        const dayObj = dailyMap.get(row.entry_date)!;
        dayObj.total += row.clips;
        dayObj.entries.push({
          entry_id: row.entry_id,
          assigned_id: row.assigned_id,
          id_value: row.id_value,
          notes: row.id_notes,
          clips: row.clips,
          updated_at: row.updated_at,
        });
      }
      rangeTotalClips += row.clips;
    });

    const dailyRecords = Array.from(dailyMap.entries()).map(([dateStr, val]) => ({
      date: dateStr,
      formatted_date: format(parseISO(dateStr), 'dd MMM yyyy (EEE)'),
      total_clips: val.total,
      entries: val.entries,
    }));

    return NextResponse.json({
      person_id: targetPersonId,
      person_name: targetPersonName,
      days_count: requestedDays,
      range_start: startDate,
      range_end: endDate,
      total_clips: rangeTotalClips,
      all_people: allPeople,
      id_summaries: assignedIdsRes.rows,
      daily_records: dailyRecords,
    });
  } catch (err: any) {
    console.error('Error in GET /api/my-history:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
