import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

    const last7DaysMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7DaysMap.set(format(d, 'yyyy-MM-dd'), 0);
    }
    const minTrendDate = Array.from(last7DaysMap.keys())[0];

    // Execute all dashboard queries in parallel (1 network round-trip burst instead of 6 sequential)
    const [
      countsRes,
      todayRes,
      monthTotalRes,
      personMonthlyRes,
      recentRes,
      trendQueryRes,
    ] = await Promise.all([
      pool.query(`
        SELECT 
          (SELECT count(*)::int FROM people) AS total_people,
          (SELECT count(*)::int FROM assigned_ids) AS total_ids
      `),
      pool.query(
        'SELECT COALESCE(SUM(clips), 0)::int AS total FROM clip_entries WHERE entry_date = $1',
        [todayStr]
      ),
      pool.query(
        'SELECT COALESCE(SUM(clips), 0)::int AS total FROM clip_entries WHERE entry_date >= $1 AND entry_date <= $2',
        [monthStart, monthEnd]
      ),
      pool.query(
        `SELECT 
          p.id AS person_id,
          p.name,
          COALESCE(SUM(ce.clips), 0)::int AS total_clips,
          COUNT(DISTINCT ai.id)::int AS assigned_ids_count
        FROM people p
        LEFT JOIN assigned_ids ai ON p.id = ai.person_id
        LEFT JOIN clip_entries ce ON ai.id = ce.assigned_id AND ce.entry_date >= $1 AND ce.entry_date <= $2
        GROUP BY p.id, p.name
        ORDER BY total_clips DESC, p.name ASC`,
        [monthStart, monthEnd]
      ),
      pool.query(
        `SELECT 
          ce.id AS entry_id,
          ce.entry_date::text AS entry_date,
          ce.clips,
          ce.created_at AS entry_created_at,
          ce.updated_at AS entry_updated_at,
          ai.id AS assigned_id,
          ai.id_value,
          ai.notes AS id_notes,
          p.id AS person_id,
          p.name AS person_name
        FROM clip_entries ce
        JOIN assigned_ids ai ON ce.assigned_id = ai.id
        JOIN people p ON ai.person_id = p.id
        ORDER BY ce.entry_date DESC, ce.created_at DESC
        LIMIT 10`
      ),
      pool.query(
        `SELECT entry_date::text, SUM(clips)::int AS total
         FROM clip_entries
         WHERE entry_date >= $1
         GROUP BY entry_date`,
        [minTrendDate]
      ),
    ]);

    trendQueryRes.rows.forEach((r) => {
      if (last7DaysMap.has(r.entry_date)) {
        last7DaysMap.set(r.entry_date, r.total);
      }
    });

    const last7DaysTrend = Array.from(last7DaysMap.entries()).map(([date, clips]) => ({
      date,
      label: format(parseISO(date), 'dd MMM'),
      clips,
    }));

    return NextResponse.json({
      totalPeople: countsRes.rows[0].total_people || 0,
      totalAssignedIds: countsRes.rows[0].total_ids || 0,
      todayTotalClips: todayRes.rows[0].total || 0,
      currentMonthTotalClips: monthTotalRes.rows[0].total || 0,
      personMonthlySummaries: personMonthlyRes.rows,
      recentEntries: recentRes.rows,
      last7DaysTrend,
    });
  } catch (err: any) {
    console.error('Error in GET /api/dashboard:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
