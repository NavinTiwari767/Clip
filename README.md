# ClipTrack - Personal Clip Tracking Web Application

A production-ready, personal clip management system built with **Next.js 14 App Router, TypeScript, Tailwind CSS, and Supabase PostgreSQL**.

Designed exclusively for **ONE ADMIN** to manage people, assign unlimited tracking IDs to each person, record daily clip counts with automatic totals and upsert handling, view monthly analytics, and export comprehensive CSV reports.

---

## 🌟 Key Features

1. **Single Admin Portal**
   - Secure Supabase Auth login.
   - Public user registration is disabled.
   - No employee accounts or employee dashboards.
   - All application routes protected by Next.js Middleware.

2. **Dashboard**
   - Real-time statistics: Total People, Total Assigned IDs, Today's Clips, Current Month's Clips.
   - 7-Day interactive Area Chart for clip production trends (Recharts).
   - Person-wise monthly clip summary rankings with percentage contributions.
   - Recent daily entries table with quick navigation.

3. **People & Unlimited IDs Management**
   - Add, edit, and delete people (e.g., Rahul, Amit).
   - Assign unlimited IDs to each person (e.g., Rahul: ID 2, ID 4, ID 50; Amit: ID 10, ID 15).
   - Edit and delete assigned IDs with optional descriptive notes (e.g., "Primary batch", "Shift B").
   - Individual profile page (`/people/[id]`) showing ID breakdown and historical performance.

4. **Daily Clip Entry (`/daily-entry`)**
   - Select date (with Quick Prev / Next Day navigation).
   - Select Person and Assigned ID.
   - **Quick Multi-ID Entry Sheet**: Enter clip counts for all IDs of a person in one screen.
   - **Automatic Duplicate Prevention (Upsert)**: If an entry already exists for the selected date and ID, it seamlessly updates instead of creating duplicate records.
   - Real-time Daily Total calculation.
   - Daily entries table with inline edit and delete capabilities.

5. **Monthly Reports & Analytics (`/reports`)**
   - Select any month and year (e.g., November 2026).
   - Each person's total clips and ID-wise clip breakdown.
   - Daily clip breakdown across the entire month.
   - Interactive bar chart comparing person performance.
   - **4 CSV Exports**:
     1. Complete Monthly Report (every entry with timestamp and notes).
     2. Person-wise Summary (totals and % of monthly volume).
     3. ID-wise Summary (individual ID totals).
     4. Date-wise Daily Breakdown (day-by-day totals).

6. **Settings & System Health (`/settings`)**
   - Database connection tester for Supabase PostgreSQL.
   - View and copy SQL migration schema.
   - Row Level Security (RLS) and architecture specifications.

---

## 🎨 Theme & Design System

- **Background**: `#0B1020`
- **Sidebar**: `#11182A`
- **Cards**: `#151E32`
- **Purple Accent**: `#7C5CFC`
- **Blue Accent**: `#3B82F6`
- **Green Success**: `#10B981`
- **Main Text**: `#F8FAFC`
- **Muted Text**: `#94A3B8`
- **Borders**: `#26334D`

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18.17+ or v20+ or v22+)
- A free Supabase account ([supabase.com](https://supabase.com))

### 2. Configure Supabase Database
1. Go to your Supabase Project Dashboard &rarr; **SQL Editor**.
2. Open `supabase/schema.sql` from this repository, copy its contents, and run it in the SQL Editor.
   - This creates `people`, `assigned_ids`, and `clip_entries` tables.
   - Sets up indexes, `updated_at` trigger, and Row Level Security (RLS) policies.
3. (Optional) Run `supabase/seed.sql` to populate sample data for Rahul (IDs 2, 4, 50) and Amit (IDs 10, 15) for November 2026.

### 3. Create the Single Admin Account
1. In Supabase Dashboard &rarr; **Authentication** &rarr; **Users**.
2. Click **Add user** &rarr; **Create user**.
3. Enter your admin email (e.g., `admin@example.com`) and a secure password.
4. Set "Auto Confirm User" to checked.
5. In **Authentication** &rarr; **Providers** &rarr; **Email**, make sure "Allow new users to sign up" is **DISABLED** to prevent public registration.

### 4. Setup Environment Variables
Edit `.env.local` in the project root:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
\`\`\`

You can find your `Project URL` and `anon public` key in Supabase Dashboard &rarr; **Project Settings** &rarr; **API**.

### 5. Run the Application

\`\`\`bash
# Development mode
npm run dev

# Production build
npm run build
npm run start
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser and log in with your admin credentials.

---

## 📁 Project Structure

\`\`\`
├── src/
│   ├── app/
│   │   ├── globals.css         # Custom Tailwind dark styling & scrollbars
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Root redirect to /dashboard
│   │   ├── login/page.tsx      # Admin login page
│   │   ├── dashboard/page.tsx  # Dashboard with stats & Recharts trend
│   │   ├── people/
│   │   │   ├── page.tsx        # People & ID listing with CRUD modals
│   │   │   └── [id]/page.tsx   # Detailed person profile & history
│   │   ├── daily-entry/page.tsx# Daily entry sheet with auto-upsert
│   │   ├── reports/page.tsx    # Monthly reports & 4 CSV exports
│   │   └── settings/page.tsx   # Supabase connection test & SQL schema
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx    # Responsive shell with mobile sidebar
│   │   │   ├── Navbar.tsx      # Sticky top navbar with date & action
│   │   │   └── Sidebar.tsx     # Modern navigation sidebar
│   │   └── ui/
│   │       ├── Button.tsx      # Reusable styled button with variants
│   │       ├── Modal.tsx       # Reusable dark dialog/modal
│   │       └── StatCard.tsx    # Metric KPI cards
│   ├── lib/
│   │   ├── services/
│   │   │   └── clipService.ts  # Supabase database queries & aggregations
│   │   ├── supabase/
│   │   │   ├── client.ts       # Browser Supabase client
│   │   │   ├── server.ts       # Server Supabase client (cookies)
│   │   │   └── middleware.ts   # Session & auth middleware
│   │   └── utils.ts            # CSV generator, formatters, and cn()
│   ├── middleware.ts           # Route protection guard
│   └── types/
│       └── database.ts         # TypeScript interfaces for models & reports
├── supabase/
│   ├── schema.sql              # Complete PostgreSQL migration schema
│   └── seed.sql                # Sample seed data (Rahul & Amit)
├── .env.example
├── .env.local
├── tailwind.config.ts
└── tsconfig.json
\`\`\`

---

## 🔒 Security Architecture
- **Supabase SSR**: Session management with secure HTTP-only cookies.
- **Row Level Security (RLS)**: Only `authenticated` admin can perform `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
- **Database Constraints**: `UNIQUE(assigned_id, entry_date)` guarantees no duplicate records can be inserted for the same ID on the same date.
- **Foreign Key Cascades**: Deleting a person safely cascades to delete their assigned IDs and clip records.
