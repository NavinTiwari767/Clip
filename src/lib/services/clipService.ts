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

// 1. Get People
export async function getPeople(): Promise<Person[]> {
  const res = await fetch('/api/people');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch people');
  }
  const data = await res.json();
  return data.people || [];
}

// 2. Get People with IDs
export async function getPeopleWithIds(): Promise<PersonWithIds[]> {
  const res = await fetch('/api/people');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch people');
  }
  const data = await res.json();
  return data.people || [];
}

// 3. Get Person By ID
export async function getPersonById(personId: string): Promise<PersonWithIds | null> {
  const res = await fetch(`/api/people/${personId}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch person');
  }
  const data = await res.json();
  return data.person || null;
}

// 4. Create Person (Admin only)
export async function createPerson(name: string): Promise<Person> {
  const res = await fetch('/api/people', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create person');
  }
  const data = await res.json();
  return data.person;
}

// 5. Update Person (Admin only)
export async function updatePerson(id: string, name: string): Promise<Person> {
  const res = await fetch(`/api/people/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update person');
  }
  const data = await res.json();
  return data.person;
}

// 6. Delete Person (Admin only)
export async function deletePerson(id: string): Promise<void> {
  const res = await fetch(`/api/people/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete person');
  }
}

// 7. Create Assigned ID (Admin only)
export async function createAssignedId(
  personId: string,
  idValue: string,
  notes?: string | null
): Promise<AssignedId> {
  const res = await fetch('/api/assigned-ids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ person_id: personId, id_value: idValue, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to assign ID');
  }
  const data = await res.json();
  return data.assigned_id;
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
  return data.assigned_id;
}

// 9. Delete Assigned ID (Admin only)
export async function deleteAssignedId(id: string): Promise<void> {
  const res = await fetch(`/api/assigned-ids/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete assigned ID');
  }
}

// 10. Get Clip Entries By Date (Both Admin & User)
export async function getClipEntriesByDate(dateString: string): Promise<ClipEntryDetail[]> {
  const res = await fetch(`/api/clip-entries?date=${encodeURIComponent(dateString)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch clip entries');
  }
  const data = await res.json();
  return data.entries || [];
}

// 11. Upsert Clip Entry (Both Admin & User can add clips)
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
  return data.entry;
}

// 12. Delete Clip Entry (Admin only)
export async function deleteClipEntry(id: string): Promise<void> {
  const res = await fetch(`/api/clip-entries/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete clip entry');
  }
}

// 13. Dashboard Data (Both Admin & User)
export async function getDashboardData() {
  const res = await fetch('/api/dashboard');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch dashboard data');
  }
  return await res.json();
}

// 14. Monthly Report (Both Admin & User)
export async function getMonthlyReport(year: number, month: number): Promise<MonthlyReportData> {
  const res = await fetch(`/api/reports?year=${year}&month=${month}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch monthly report');
  }
  return await res.json();
}
