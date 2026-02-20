
## PipelineRCA AI — MVP Build Plan

A production-ready B2B SaaS tool for data engineers to upload pipeline logs, get AI-powered root cause analysis, and track their history — all in a clean enterprise UI.

---

### 1. Design System & Global Layout
- Dark/light mode toggle (persisted to localStorage)
- Enterprise color palette: slate/neutral grays, blue accent
- Collapsible sidebar with three nav items: **Dashboard**, **Analysis History**, **Account Settings**
- Responsive layout that works on desktop and tablet

---

### 2. Authentication Pages
- **Landing page** (`/`) — Hero section explaining the product, with Login and Sign Up CTAs
- **Sign Up page** (`/signup`) — Email + password form with Supabase Auth
- **Login page** (`/login`) — Email + password form
- After login → redirect to `/dashboard`
- Protected routes: unauthenticated users are redirected to `/login`

---

### 3. Database Setup (Supabase)
Create the `log_analyses` table with:
- `id`, `user_id` (FK to auth.users), `file_name`, `raw_log`
- `detected_error_type`, `root_cause_summary`, `suggested_fix`, `business_impact`
- `created_at` (default now())
- Row-Level Security (RLS) so users only see their own analyses

---

### 4. Dashboard — Log Input
Two input methods side by side:
- **File upload** — drag & drop or click to upload a `.txt` log file
- **Paste logs** — textarea for manual input
- "Analyze Log" button (disabled while loading)
- Loading spinner with status message during analysis

---

### 5. Rule-Based Log Parser
Before hitting the AI, client-side parsing detects patterns:
- `OutOfMemoryError`, `NullPointerException`, `TimeoutException`, `Permission denied`, `Schema mismatch`
- Assigns a `detected_error_type` label
- Extracts the most relevant error snippet from the log

---

### 6. AI Analysis via Supabase Edge Function
A secure edge function (`analyze`) that:
- Receives the raw log, detected error type, and extracted snippet
- Calls Lovable AI Gateway (Gemini Flash) with a structured system prompt acting as a "senior data platform reliability engineer"
- Returns structured JSON: `root_cause_summary`, `suggested_fix`, `business_impact`
- Groq key / AI key never exposed to the frontend

---

### 7. Dashboard — Analysis Results
After analysis completes, display a results card showing:
- **Failure Category** (the detected error type badge)
- **Root Cause Explanation**
- **Suggested Fix**
- **Preventive Recommendation** (derived from the fix)
- **Business Impact**

---

### 8. Analysis History Page
- List of all past analyses for the logged-in user
- Sorted latest first
- Each row shows: file name, error type badge, timestamp, and a "View" button to expand the full result
- Analyses are persisted to Supabase after each successful run

---

### 9. Account Settings Page
- Display current user email
- Change password form
- Sign out button

---

### 10. Error Handling & UX Polish
- Toast notifications for success, errors, and rate limit messages
- Empty states for history (first-time users)
- Form validation on auth pages
- Graceful error messages if the AI call fails
