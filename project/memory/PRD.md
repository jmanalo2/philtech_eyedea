# Philtech Eye-dea - Product Requirements Document

## Original Problem Statement
Build an app named "Philtech Eye-dea" for organizational idea management with:
- User authentication and role-based access
- Idea submission and multi-step approval workflow
- Organizational hierarchy (Pillar → Department → Team)
- Multiple user roles: User, Approver (with sub-roles), Admin
- C.I. Excellence team evaluation features
- Admin management of all organizational entities

## Core Requirements

### User Roles & Permissions
| Role | Permissions |
|------|-------------|
| **User** | View dashboard, submit ideas, see own ideas, view profile |
| **Approver** | Approve/decline/request revisions, view all submitted ideas |
| **C.I. Excellence Team** | Evaluate approved ideas (Quick Win, Complexity), assign to T&E |
| **Admin** | Manage users, departments, pillars, teams, tech persons |

### Idea Fields
- Idea Number (auto-generated: EYE-00001)
- Pillar, Department, Team
- Idea Title, Improvement Type
- Current Process, Suggested Solution, Benefits
- Status, Target Completion

### Organizational Hierarchy
```
Pillar (GBS, Tech, Finance, HR)
  └── Department (Finance and Accounting, HR Ops, etc.)
       └── Team (Allowance Billing, Payroll, etc.)
```

---

## What's Been Implemented ✅

### Authentication & Users (Dec 2025)
- [x] User registration with organizational hierarchy fields
- [x] JWT-based login/logout
- [x] Password change functionality
- [x] Forgot password (MOCKED - links shown in UI)
- [x] Role-based access control
- [x] Approver sub-role selection (Approver vs C.I. Excellence)

### Admin Panel (Jan 2026)
- [x] Users tab - CRUD with Team column
- [x] Pillars tab - Add/delete organizational pillars
- [x] Departments tab - Add/delete with pillar association
- [x] Teams tab - Add/delete with pillar/department association
- [x] Tech & Engineering tab - Manage T&E personnel
- [x] Bulk user upload via CSV
- [x] Seed sample data button

### Idea Management
- [x] Idea submission form
- [x] Idea listing with filters
- [x] Idea detail view
- [x] Approval workflow (Approve/Decline/Request Revision)
- [x] Resubmit after revision
- [x] Comments on ideas

### C.I. Excellence Team (Jan 2026)
- [x] CIEvaluationPanel component with Tech Person dropdown
- [x] Quick Win / Complexity tagging
- [x] Cost savings / Time saved fields
- [x] Sub-role change in Profile page
- [x] **C.I. Excellence Dashboard** with analytics charts
- [x] **Excel Export** button for ideas data
- [x] Complexity distribution pie chart
- [x] Approval overview bar chart
- [x] Cost savings & time saved summaries

### Public APIs (for Registration)
- [x] `/api/public/pillars` - No auth required
- [x] `/api/public/departments` - With pillar filter
- [x] `/api/public/teams` - With pillar/department filters

---

## Prioritized Backlog

### P0 - Critical
- None currently

### P1 - High Priority
- [ ] "Best Idea" selection UI for C.I. team
- [ ] Analytics filters by date range

### P2 - Medium Priority
- [ ] Real email integration (Resend API)
- [ ] Email notifications for approval workflow

### P3 - Low Priority / Future
- [ ] Mobile-responsive improvements
- [ ] Dashboard filters by pillar/department

---

## Technical Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py       # All models, routes, logic
├── .env            # MONGO_URL, JWT_SECRET, etc.
└── requirements.txt
```

### Frontend (React + Tailwind + shadcn/ui)
```
/app/frontend/src/
├── components/
│   ├── ui/              # shadcn components
│   ├── CIEvaluationPanel.js
│   └── Layout.js
├── pages/
│   ├── AdminPanel.js    # 5-tab admin management
│   ├── Login.js         # Login + Registration
│   ├── Profile.js       # User profile + sub-role
│   ├── Dashboard.js
│   ├── CreateIdea.js
│   ├── IdeaDetail.js
│   └── IdeasList.js
└── contexts/
    └── AuthContext.js
```

### Key API Endpoints
- Auth: `/api/auth/{login,register,change-password,forgot-password,reset-password,set-sub-role}`
- Ideas: `/api/ideas`, `/api/ideas/{id}/{approve,decline,request-revision,resubmit,ci-evaluate}`
- Admin: `/api/admin/{users,pillars,departments,teams,tech-persons}`
- Public: `/api/public/{pillars,departments,teams}`
- Analytics: `/api/dashboard/{stats,analytics,export-excel}`

---

## Test Accounts
| Username | Password | Role | Status |
|----------|----------|------|--------|
| admin | admin123 | Admin | ✅ Working |
| approver1 | approver123 | Approver | ✅ Working |
| user1 | user123 | User | ⚠️ Password hash mismatch |

---

## MOCKED Services
- **Email (Resend)**: Password reset links are displayed in the UI instead of being sent via email. Full integration requires RESEND_API_KEY configuration.

---

## Seeded Data
- 5 Pillars: GBS, Tech, Finance, HR, Test Pillar
- 12 Departments (linked to pillars)
- 22 Teams (linked to departments)
- 10 Tech & Engineering personnel with specializations
