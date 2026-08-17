# ASF RSU Document Portal — Planning

## 1. Purpose
A website for **Adventist Student Fellowship (ASF), RSU** where the fellowship's departments/units can log in, and store, organize, upload, and retrieve their own files and documents for reference purposes.

**Scope note:** This is a single-organization tool built specifically for ASF RSU, not a multi-tenant platform for many organizations to sign up to. The public pages exist to give context and a professional front door — not to attract new organizations. Keep this in mind: it means the public zone can be simple, and there's no need for a "sign up new organization" flow.

## 2. Users & Access Model

| Role | Access |
|---|---|
| Org Admin | Full access — manage all departments, users, permissions, shared folder |
| Executive Officer (President, VP, Secretary, Financial Secretary, Treasurer) | Can view **all** departments' folders (oversight access), in addition to managing their own executive folder |
| Department Head | Admin rights *within their own department* — manage that department's users, folders, permissions |
| Department User | Access only to their department's folders/files; can upload, view, download |
| (Optional) Viewer | Read-only access, no upload rights |

**Note:** Executive oversight access is *view* access across departments by default. Worth deciding later whether Executives can also upload/delete in other departments' folders, or strictly view/download only.

**Access logic:** ASF RSU login → routed into department-scoped workspace → user only sees their department's folders (plus the Shared folder) unless given broader permission.

## 3. Core Features (MVP — small scale)

1. **Authentication** — organization login, department-based accounts
2. **Folder structure** — departments as top-level folders, sub-folders within
3. **File upload** — drag/drop or button upload, common file types (PDF, DOCX, XLSX, images)
4. **File retrieval** — browse, search, download
5. **Search** — by file name, maybe by tag/date/department
6. **Basic file metadata** — uploaded by, date, file type, size
7. **Permissions** — department-level isolation, admin override

### Nice-to-haves (later phases, not MVP)
- Version history (track file changes over time)
- Activity log (who uploaded/deleted what, when)
- File preview without downloading
- Comments/notes on files
- Trash/recently deleted (recovery window)
- Notifications (e.g. "new file uploaded to your department")

## 4. Information Architecture

The site has two zones: a **public zone** (anyone can see, no login) and an **app zone** (login required). This is the same pattern used by Dropbox, Notion, Slack, etc. — public marketing pages sit in front of the actual product.

### 4a. Public Zone (before login)

Since this is for one organization, these pages are simple and informational — not a sales funnel.

1. **Home** — brief intro to the organization / the portal, call-to-action ("Log In")
2. **About** — the organization's background, mission
3. **Features** *(optional — may not be needed for an internal tool)* — what the portal lets departments do
4. **Contact** — support contact for staff (e.g. "having trouble logging in? contact IT")
5. **Login** — entry point into the app zone
6. *(Optional)* **Privacy Policy** — relevant since it stores organizational documents

### 4b. App Zone (after login)

1. **Dashboard** — landing after login; recent files, quick access, department overview
2. **Department Workspace** — folder/file browser for that department
3. **Folder View** — contents of a specific folder, breadcrumb navigation
4. **File Detail / Preview** — metadata, preview, download, delete (if permitted)
5. **Upload Flow** — select folder → upload file(s) → confirm
6. **Search Results**
7. **Archive** — searchable view of older files (e.g. past academic sessions), kept permanently but separated from the "active" workspace to reduce clutter
7. **Admin Panel** — org admins see full org controls (departments, users, storage); department heads see a scoped version limited to their own department's users and folders
8. **Account/Settings** — user profile, password, notification preferences

**Navigation note:** the public zone should have its own nav (Home, About, Features, Contact, Login), and once logged in, the user moves into a separate app nav (Dashboard, Departments, Search, Account) — don't mix the two navigation systems.

## 5. Folder Structure Logic (example)

**Decision made:** every department uses the same fixed folder template — consistent structure across the fellowship, easier to govern and easier for anyone (including admins) to find things.

**Full department/unit list (confirmed):**
- Executive: President, Vice President, Secretary, Financial Secretary, Treasurer
- Ministries/Units: Sabbath School, Music Director, Ushering, Technical, Welfare, Sports, Academic Director, Health, Final Year (FYB), Public Relations Officer (PRO), Chaplaincy, Brothers, Sisters

**Paired departments:** Some departments work closely together but still need to keep their own separate document space:
- **Ushering / Technical** — shown together as a paired group, but each has its own distinct folder where they upload their own work
- **Brothers / Sisters** — same pattern: grouped together, but separate folders each

This means in the workspace view, these show as a linked pair (e.g. under one "Ushering & Technical" section with two clearly separate sub-areas) rather than fully merged into one shared folder.

```
ASF RSU
 ├─ Shared / Fellowship-wide       ← visible to all departments
 │   ├─ Policies
 │   ├─ General Announcements
 │   └─ Executive/Leadership Documents
 │
 ├─ Executive
 │   ├─ President
 │   ├─ Vice President
 │   ├─ Secretary
 │   ├─ Financial Secretary
 │   └─ Treasurer
 │
 ├─ Ushering & Technical            ← paired group
 │   ├─ Ushering
 │   │   ├─ Monthly Reports
 │   │   ├─ Plan of Work (Sessions)
 │   │   ├─ Programs / Schedule
 │   │   └─ Inventories
 │   └─ Technical
 │       ├─ Monthly Reports
 │       ├─ Plan of Work (Sessions)
 │       ├─ Programs / Schedule
 │       └─ Inventories
 │
 ├─ Brothers & Sisters              ← paired group
 │   ├─ Brothers
 │   │   └─ (same folder template)
 │   └─ Sisters
 │       └─ (same folder template)
 │
 ├─ Sabbath School
 │   ├─ Monthly Reports
 │   ├─ Plan of Work (Sessions)
 │   ├─ Programs / Schedule
 │   └─ Inventories
 │
 ├─ Music Director
 ├─ Welfare
 ├─ Sports
 ├─ Academic Director
 ├─ Health
 ├─ Final Year (FYB)
 ├─ Public Relations Officer (PRO)
 ├─ Chaplaincy
 │   └─ (each uses the same folder template)
 └─ ...
```

**Note:** template categories confirmed: **Monthly Reports, Plan of Work (Sessions), Programs/Schedule, Inventories.** Add more categories here if a department needs something extra beyond this base template.

Decide early: **fixed folder templates per department** (consistent structure) vs **flexible/custom folders** (each department organizes their own way). Fixed = easier to govern; flexible = more usable but messier over time.

## 6. Non-Functional Considerations (small scale, but still matters)

- **Storage** — where files actually live (cloud storage provider vs self-hosted) — affects cost and scalability
- **File size limits** — per upload, and total storage per department
- **Security** — encryption at rest/in transit, access logs, especially since it's document storage
- **Backup** — accidental deletion recovery
- **Naming conventions / duplicate handling** — what happens if two people upload "Report.pdf"?
- **Retention:** Nothing is ever deleted by default — all files are kept permanently. Older files (e.g. past academic sessions) move into a searchable **Archive** view rather than being removed, so history stays accessible but the "active" workspace doesn't get cluttered.
- **File types:** Mainly documents (PDF, Word, Excel) and images (event photos, flyers). No video/audio expected — good, since that keeps storage needs and costs modest.

## 7. Suggested Build Phases

**Phase 1 (MVP):** Login, department folders, upload, browse, download, basic search
**Phase 2:** Admin panel, permissions refinement, activity log
**Phase 3:** Version history, file preview, notifications, trash/recovery

## 8. Open Questions to Resolve Before Building
All major structural questions are now resolved. Remaining decisions are smaller/operational, to settle whenever convenient:
- Rough storage volume estimate (helps pick a storage provider/plan later — not urgent at small scale)
- Whether Executives get upload/delete rights in other departments' folders, or view/download only (see Section 2 note)

## 9. Screen Designs (visual reference)

All core screens have been sketched to make the structure concrete:

- **Login** — department selector, username, password
- **Dashboard** — sidebar nav (Dashboard, My department, Shared, Search, Archive, Account), quick stats, recent files
- **Department Workspace** — breadcrumb, 4 fixed folders (Monthly Reports, Plan of Work, Programs/Schedule, Inventories), file list
- **Paired-Department View** (e.g. Ushering & Technical, Brothers & Sisters) — shared header, but each side keeps its own separate folders and upload button
- **Archive/Search** — dedicated searchable view for older files, filterable by department and year, kept separate from the active workspace
- **Department Head Admin** — scoped to their own department: manage their users (department head/member/viewer roles) and view folder file counts
- **Org Admin Panel** — full oversight: org-wide stats, list of all 18 departments tagged Executive/Ministry/Paired

## 10. Build Roadmap (self-guided, with Claude as backup)

**Approach chosen:** Guided custom build using Supabase (free backend: auth, storage, permissions) + a simple front-end. You build it yourself, step by step, and consult Claude whenever you're stuck, need something explained, or need code written.

### Tools to set up first
- **Supabase account** (free) — handles login, database, file storage, and permission rules
- **Code editor** — VS Code (free) is the standard choice
- **GitHub account** (free) — to save your project and track changes as you build
- **Hosting** — Vercel or Netlify (free tier) — makes the site actually live on the internet once built

### Build order (matches the phases from Section 7)

**Stage 1 — Foundation**
1. Create Supabase project; set up the department list as data (President, Sabbath School, Ushering, etc.)
2. Set up authentication (login system) in Supabase
3. Build the basic login screen (matches our design) and connect it to Supabase auth
4. Confirm: can a test user log in and land on a dashboard?

**Stage 2 — Core file features**
5. Set up file storage in Supabase (this is where uploaded documents actually live)
6. Build the Department Workspace screen — show the 4 fixed folders per department
7. Build Upload — connect the upload button to Supabase storage
8. Build file listing/download for a folder

**Stage 3 — Permissions**
9. Set up permission rules in Supabase so each department only sees its own files
10. Add the Shared folder (visible to everyone)
11. Add Executive oversight access (view across all departments)
12. Build the paired-department view (Ushering/Technical, Brothers/Sisters)

**Stage 4 — Search & Archive**
13. Build basic search within a department
14. Build the Archive screen with filters (department, year)
15. Set up the logic for moving older files into Archive view

**Stage 5 — Admin & polish**
16. Build Department Head Admin panel (manage own users/folders)
17. Build Org Admin panel (full oversight)
18. Add the public pages (Home, About, Contact)
19. Test with real department heads before wider rollout

### How to use Claude along the way
- Ask for the actual code for any specific screen or step above — Claude can generate it matching the designs already made
- Ask for explanations of Supabase concepts (auth, storage policies, permissions) in plain terms as you go
- Share error messages when something breaks — Claude can help debug
- Ask for one step at a time rather than the whole project at once — easier to follow and test as you go


## 11. Tech Stack

**Front-end (the screens people see and interact with):**
- **HTML** — structure of each page
- **CSS** — styling and layout, to match the screen designs in Section 9
- **JavaScript** — logic: handling login, file uploads, displaying folders, connecting to Supabase

**Backend (mostly handled by Supabase, not hand-written from scratch):**
- **Supabase** — free backend service providing authentication, file storage, and database/permissions
- **SQL** — used occasionally within Supabase's dashboard to set up tables and permission rules (small amounts, not a full language to master)
- **Supabase JavaScript library** — plugs into the front-end JavaScript to talk to Supabase (login, upload, fetch files) — no separate language needed, it's just JavaScript

**Optional, for later (not required for MVP):**
- **React** (a JavaScript framework) — could make a larger, more complex app easier to manage down the line, but plain HTML/CSS/JS is sufficient for the scope of this project at ASF RSU's scale

**Summary:** two core languages to focus on — **HTML/CSS** for structure and style, **JavaScript** for logic and connecting to Supabase. Everything in the build roadmap (Section 10) maps to these.
