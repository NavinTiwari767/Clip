export interface Person {
  id: string;
  name: string;
  email?: string | null;
  user_id?: string | null;
  created_at: string;
}

export interface AssignedId {
  id: string;
  person_id: string;
  id_value: string;
  notes?: string | null;
  created_at: string;
  total_clips?: number;
}

export interface ClipEntry {
  id: string;
  assigned_id: string;
  entry_date: string;
  clips: number;
  created_at: string;
  updated_at: string;
}

export interface ClipEntryDetail {
  entry_id: string;
  entry_date: string;
  clips: number;
  entry_created_at: string;
  entry_updated_at: string;
  assigned_id: string;
  id_value: string;
  id_notes?: string | null;
  person_id: string;
  person_name: string;
}

export interface PersonWithIds extends Person {
  assigned_ids: AssignedId[];
  total_clips?: number;
}

export interface AssignedIdWithClips extends AssignedId {
  person_name?: string;
  total_clips?: number;
}

export interface DailyEntryRow {
  assigned_id: string;
  id_value: string;
  person_id: string;
  person_name: string;
  notes?: string | null;
  clips: number;
  existing_entry_id?: string;
  is_modified?: boolean;
}

export interface PersonReportSummary {
  person_id: string;
  person_name: string;
  total_clips: number;
  assigned_ids_count: number;
  id_breakdown: {
    assigned_id: string;
    id_value: string;
    notes?: string | null;
    clips: number;
  }[];
}

export interface MonthlyReportData {
  month: number;
  year: number;
  month_name: string;
  overall_total_clips: number;
  total_people_active: number;
  total_ids_active: number;
  person_summaries: PersonReportSummary[];
  id_summaries: {
    assigned_id: string;
    id_value: string;
    person_name: string;
    person_id: string;
    notes?: string | null;
    total_clips: number;
  }[];
  daily_totals: {
    date: string;
    formatted_date: string;
    total_clips: number;
  }[];
  all_entries: ClipEntryDetail[];
}

export interface PersonalHistoryRecord {
  entry_id: string;
  entry_date: string;
  clips: number;
  assigned_id: string;
  id_value: string;
  id_notes?: string | null;
}

export interface PersonalHistoryData {
  person_name: string;
  person_id: string;
  email?: string | null;
  total_clips: number;
  days_count: number;
  id_summaries: {
    assigned_id: string;
    id_value: string;
    notes?: string | null;
    total_clips: number;
  }[];
  daily_records: {
    date: string;
    formatted_date: string;
    total_clips: number;
    entries: {
      id_value: string;
      notes?: string | null;
      clips: number;
    }[];
  }[];
}
