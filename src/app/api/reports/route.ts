import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { format, startOfMonth, endOfMonth, parseISO, getDaysInMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10);

    const dateObj = new Date(year, month - 1, 1);
    const startDate = format(startOfMonth(dateObj), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(dateObj), 'yyyy-MM-dd');
    const monthName = format(dateObj, 'MMMM yyyy');

    // 1. All people
    const peopleRes = await pool.query('SELECT * FROM people ORDER BY name ASC');
    // 2. All assigned IDs
    const idsRes = await pool.query('SELECT * FROM assigned_ids ORDER BY id_value ASC');

    // 3. All clip entries in month
    const entriesRes = await pool.query(
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
      WHERE ce.entry_date >= $1 AND ce.entry_date <= $2
      ORDER BY ce.entry_date ASC`,
      [startDate, endDate]
    );

    const allEntries = entriesRes.rows;
    const overallTotal = allEntries.reduce((sum, e) => sum + (e.clips || 0), 0);

    // Grouping
    const personMap = new Map<string, any>();
    peopleRes.rows.forEach((p) => {
      personMap.set(p.id, {
        person_id: p.id,
        person_name: p.name,
        total_clips: 0,
        assigned_ids_count: 0,
        id_breakdown: [],
      });
    });

    const idMap = new Map<string, any>();
    idsRes.rows.forEach((i) => {
      const p = peopleRes.rows.find((pr) => pr.id === i.person_id);
      idMap.set(i.id, {
        assigned_id: i.id,
        id_value: i.id_value,
        person_name: p?.name || 'Unknown',
        person_id: i.person_id,
        notes: i.notes,
        total_clips: 0,
      });
    });

    allEntries.forEach((e) => {
      if (personMap.has(e.person_id)) {
        personMap.get(e.person_id).total_clips += e.clips;
      }
      if (idMap.has(e.assigned_id)) {
        idMap.get(e.assigned_id).total_clips += e.clips;
      }
    });

    idMap.forEach((idObj) => {
      if (personMap.has(idObj.person_id)) {
        const p = personMap.get(idObj.person_id);
        p.id_breakdown.push({
          assigned_id: idObj.assigned_id,
          id_value: idObj.id_value,
          notes: idObj.notes,
          clips: idObj.total_clips,
        });
        p.assigned_ids_count = p.id_breakdown.length;
      }
    });

    // Daily totals
    const daysInMonth = getDaysInMonth(dateObj);
    const dailyMap = new Map<string, number>();
    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyMap.set(dStr, 0);
    }

    allEntries.forEach((e) => {
      if (dailyMap.has(e.entry_date)) {
        dailyMap.set(e.entry_date, dailyMap.get(e.entry_date)! + e.clips);
      }
    });

    const dailyTotals = Array.from(dailyMap.entries()).map(([date, total]) => ({
      date,
      formatted_date: format(parseISO(date), 'dd MMM yyyy (EEE)'),
      total_clips: total,
    }));

    const activePeopleCount = Array.from(personMap.values()).filter((p) => p.total_clips > 0).length;
    const activeIdsCount = Array.from(idMap.values()).filter((i) => i.total_clips > 0).length;

    return NextResponse.json({
      month,
      year,
      month_name: monthName,
      overall_total_clips: overallTotal,
      total_people_active: activePeopleCount,
      total_ids_active: activeIdsCount,
      person_summaries: Array.from(personMap.values()).sort((a, b) => b.total_clips - a.total_clips),
      id_summaries: Array.from(idMap.values()).sort((a, b) => b.total_clips - a.total_clips),
      daily_totals: dailyTotals,
      all_entries: allEntries,
    });
  } catch (err: any) {
    console.error('Error in GET /api/reports:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
