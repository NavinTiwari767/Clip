import type {
  Person,
  AssignedId,
  ClipEntry,
  ClipEntryDetail,
  PersonWithIds,
  MonthlyReportData,
} from '@/types/database';

export function isSupabaseConfigured(): boolean {
  return true;
}

// ============================================================================
// IN-MEMORY CLIENT CACHE FOR INSTANT SINGLE-CLICK NAVIGATION
// ============================================================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const clientCache = new Map<string, CacheEntry<any>>();
const inflightRequests = new Map<string, Promise<any>>();

export function peekCache<T>(key: string, maxAgeMs = 60000): T | null {
  const entry = clientCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > maxAgeMs) return null;
  return entry.data as T;
}

export function clearClientCache() {
  clientCache.clear();
}

async function fetchWithCache<T>(key: string, fetcher: () => Promise<T>, force = false): Promise<T> {
  if (!force) {
    const existing = inflightRequests.get(key);
    if (existing) return existing as Promise<T>;
  }

  const promise = fetcher()
    .then((data) => {
      clientCache.set(key, { data, timestamp: Date.now() });
      return data;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, promise);
  return promise;
}

export function peekPeopleCache(): PersonWithIds[] | null {
  return peekCache<PersonWithIds[]>('people_with_ids');
}

export function peekDashboardCache(): any | null {
  return peekCache<any>('dashboard');
}

export function peekDailyEntriesCache(dateString: string): ClipEntryDetail[] | null {
  return peekCache<ClipEntryDetail[]>(`daily_${dateString}`);
}

export function peekMonthlyReportCache(year: number, month: number): MonthlyReportData | null {
  return peekCache<MonthlyReportData>(`report_${year}_${month}`);
}

// 1. Get People (with assigned IDs & total clips)
export async function getPeople(): Promise<Person[]> {
  return getPeopleWithIds();
}

// 2. Get People with IDs & total clips
export async function getPeopleWithIds(force = false): Promise<PersonWithIds[]> {
  return fetchWithCache(
    'people_with_ids',
    async () => {
      const res = await fetch('/api/people');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch people');
      }
      const data = await res.json();
      return data.people || [];
    },
    force
  );
}

// 3. Get Person By ID
export async function getPersonById(personId: string): Promise<PersonWithIds | null> {
  return fetchWithCache(`person_${personId}`, async () => {
    const res = await fetch(`/api/people/${personId}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch person');
    }
    const data = await res.json();
    return data.person || null;
  });
}

// 4. Create Member with Email & Password (Admin only)
export async function createPerson(name: string, email?: string, password?: string): Promise<Person> {
  const res = await fetch('/api/people', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create member');
  }
  const data = await res.json();
  clearClientCache();
  return data.person;
}

// 5. Update Person (Admin only)
export async function updatePerson(id: string, name: string, email?: string, password?: string): Promise<Person> {
  const res = await fetch(`/api/people/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update member');
  }
  const data = await res.json();
  clearClientCache();
  return data.person;
}

// 6. Delete Person (Admin only)
export async function deletePerson(id: string): Promise<void> {
  const res = await fetch(`/api/people/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete member');
  }
  clearClientCache();
}

// 7. Create Assigned ID (supports single ID or bulk multiple IDs)
export async function createAssignedId(
  personId: string,
  idValue: string,
  notes?: string | null,
  bulkIds?: string
): Promise<any> {
  const res = await fetch('/api/assigned-ids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      person_id: personId,
      id_value: idValue,
      notes,
      bulk_ids: bulkIds,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to assign ID');
  }
  clearClientCache();
  return await res.json();
}

// 8. Update Assigned ID (Admin only)
export async function updateAssignedId(
  id: string,
  idValue: string,
  notes?: string | null
): Promise<AssignedId> {
  const res = await fetch(`/api/assigned-ids/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_value: idValue, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update assigned ID');
  }
  const data = await res.json();
  clearClientCache();
  return data.assigned_id;
}

// 9. Delete Assigned ID (Admin only)
export async function deleteAssignedId(id: string): Promise<void> {
  const res = await fetch(`/api/assigned-ids/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete assigned ID');
  }
  clearClientCache();
}

// 10. Get Clip Entries By Date
export async function getClipEntriesByDate(dateString: string, force = false): Promise<ClipEntryDetail[]> {
  return fetchWithCache(
    `daily_${dateString}`,
    async () => {
      const res = await fetch(`/api/clip-entries?date=${encodeURIComponent(dateString)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch clip entries');
      }
      const data = await res.json();
      return data.entries || [];
    },
    force
  );
}

// 11. Create Clip Entry (Members add new clips for their assigned IDs)
export async function upsertClipEntry(
  assignedId: string,
  entryDate: string,
  clips: number
): Promise<ClipEntry> {
  const res = await fetch('/api/clip-entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assigned_id: assignedId, entry_date: entryDate, clips }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save clip entry');
  }
  const data = await res.json();
  clearClientCache();
  return data.entry;
}

// 11b. Batch Create Clip Entries in 1 single request
export async function batchCreateClipEntries(
  entries: { assigned_id: string; entry_date: string; clips: number }[]
): Promise<ClipEntry[]> {
  const res = await fetch('/api/clip-entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save clip entries');
  }
  const data = await res.json();
  clearClientCache();
  return data.entries || [];
}

// 12. Update / Manipulate Clip Entry (Admin only)
export async function updateClipEntry(
  entryId: string,
  clips: number,
  entryDate?: string
): Promise<ClipEntry> {
  const res = await fetch(`/api/clip-entries/${entryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clips, entry_date: entryDate }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update clip entry');
  }
  const data = await res.json();
  clearClientCache();
  return data.entry;
}

// 13. Delete Clip Entry (Admin only)
export async function deleteClipEntry(id: string): Promise<void> {
  const res = await fetch(`/api/clip-entries/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete clip entry');
  }
  clearClientCache();
}

// 14. Dashboard Data
export async function getDashboardData(force = false) {
  return fetchWithCache(
    'dashboard',
    async () => {
      const res = await fetch('/api/dashboard');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch dashboard data');
      }
      return await res.json();
    },
    force
  );
}

// 15. Monthly Report
export async function getMonthlyReport(year: number, month: number, force = false): Promise<MonthlyReportData> {
  return fetchWithCache(
    `report_${year}_${month}`,
    async () => {
      const res = await fetch(`/api/reports?year=${year}&month=${month}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch monthly report');
      }
      return await res.json();
    },
    force
  );
}

// 16. Personal / Member History
export function peekMyHistoryCache(days: number, personId?: string): any | null {
  return peekCache(`history_${days}_${personId || 'self'}`);
}

export async function getMyHistory(days: number, personId?: string, force = false): Promise<any> {
  const key = `history_${days}_${personId || 'self'}`;
  return fetchWithCache(
    key,
    async () => {
      const qs = new URLSearchParams({ days: String(days) });
      if (personId) qs.set('personId', personId);
      const res = await fetch(`/api/my-history?${qs.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch history');
      }
      return await res.json();
    },
    force
  );
}
