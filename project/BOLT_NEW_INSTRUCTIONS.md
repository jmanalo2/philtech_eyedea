# Bolt.new Project Import Instructions

## Project Overview
Create "Philtech Eye-dea" - a comprehensive organizational idea management platform with role-based access control, multi-step approval workflow, and analytics dashboard.

## Architecture

### Technology Stack
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Frontend**: React 19 with React Router v7
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **Database**: MongoDB
- **Authentication**: JWT with Bearer tokens
- **Styling**: Tailwind CSS + shadcn/ui component library

### Project Structure
```
project/
├── backend/
│   ├── server.py           # Complete FastAPI backend (1500 lines)
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Environment variables
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── ui/         # shadcn/ui components (50+ components)
    │   │   ├── Layout.js
    │   │   └── CIEvaluationPanel.js
    │   ├── contexts/
    │   │   └── AuthContext.js
    │   ├── pages/
    │   │   ├── Login.js
    │   │   ├── ForgotPassword.js
    │   │   ├── ResetPassword.js
    │   │   ├── RoleSelection.js
    │   │   ├── Dashboard.js
    │   │   ├── CIDashboard.js
    │   │   ├── IdeasList.js
    │   │   ├── IdeaDetail.js
    │   │   ├── CreateIdea.js
    │   │   ├── AdminPanel.js
    │   │   └── Profile.js
    │   ├── App.js
    │   ├── App.css
    │   ├── index.js
    │   └── index.css
    ├── package.json
    ├── craco.config.js
    ├── tailwind.config.js
    └── components.json
```

## Core Features to Implement

### 1. User Authentication & Authorization
- **Registration**: Username, email, password, role, organizational hierarchy (pillar, department, team)
- **Login**: JWT-based authentication with 30-day token expiration
- **Password Management**: Change password (authenticated), forgot password with reset token, reset password with token validation
- **Roles**:
  - User: Submit ideas, view own submissions
  - Approver: Approve/decline/request revisions (sub-roles: "approver" or "ci_excellence")
  - C.I. Excellence Team: Evaluate approved ideas with metrics
  - Admin: Full system access

### 2. Organizational Hierarchy
Three-level structure:
- **Pillars**: Top-level (e.g., GBS, Tech, Finance, HR)
- **Departments**: Mid-level, linked to pillars
- **Teams**: Bottom-level, linked to departments

### 3. Idea Management
**Idea Fields**:
- Auto-generated ID (format: EYE-00001, EYE-00002, etc.)
- Pillar, Department, Team
- Title, Improvement Type
- Current Process, Suggested Solution, Benefits
- Target Completion Date
- Status: draft, pending, approved, declined, revision_requested, implemented, assigned_to_te
- Submitted by (user info)
- Assigned approver (auto-assigned based on pillar/department)

**Workflow**:
1. User submits idea → Status: pending
2. Approver can: Approve / Decline / Request Revision
3. If revision requested → User can resubmit → Back to pending
4. If approved → C.I. Excellence Team evaluates
5. C.I. can mark as Quick Win (auto-implemented) or assign to Tech & Engineering

### 4. C.I. Excellence Team Evaluation
**Evaluation Fields**:
- Quick Win: Yes/No (if yes, auto-mark as implemented)
- Complexity Level: Low / Medium / High
- Savings Type: cost_savings / time_saved
- Cost Savings: Numeric value
- Time Saved: Hours and Minutes
- Evaluation Notes: Text field
- Assign to Tech & Engineering: Yes/No
- Tech Person Name: Dropdown of T&E personnel

**C.I. Dashboard Features**:
- Analytics charts (complexity distribution pie chart, approval overview bar chart)
- Quick Wins count
- Total cost savings and time saved summaries
- Best idea selection
- Excel export functionality
- Filters by date range

### 5. Admin Panel
Five-tab management interface:

**Tab 1: Users**
- CRUD operations for users
- Bulk CSV upload for users
- Fields: username, email, role, department, team, pillar, manager
- Cannot delete demo accounts (admin, approver1, user1)

**Tab 2: Pillars**
- Add/delete organizational pillars
- Simple name field

**Tab 3: Departments**
- Add/delete departments
- Link to specific pillar

**Tab 4: Teams**
- Add/delete teams
- Link to specific pillar and department

**Tab 5: Tech & Engineering**
- Manage T&E personnel
- Fields: name, email, specialization

**Additional Features**:
- Seed sample data button (creates pillars, departments, teams, demo users, sample ideas)

### 6. Comments System
- Users can add comments to ideas
- Comments show username and timestamp
- Displayed on idea detail page

## API Endpoints Structure

### Public Routes (No Auth)
- GET /api/health
- GET /api/public/pillars
- GET /api/public/departments?pillar={pillar}
- GET /api/public/teams?pillar={pillar}&department={department}

### Auth Routes
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/change-password
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/set-sub-role

### Ideas Routes
- GET /api/ideas (with filters: status, pillar, department, team, submitted_by, assigned_approver)
- POST /api/ideas
- GET /api/ideas/{id}
- PUT /api/ideas/{id}
- DELETE /api/ideas/{id}
- POST /api/ideas/{id}/approve
- POST /api/ideas/{id}/decline
- POST /api/ideas/{id}/request-revision
- POST /api/ideas/{id}/resubmit
- GET /api/ideas/{id}/comments
- POST /api/ideas/{id}/comments

### C.I. Excellence Routes
- POST /api/ideas/{id}/ci-evaluate
- POST /api/ideas/{id}/set-best-idea
- POST /api/ideas/{id}/mark-best-idea
- POST /api/ideas/{id}/ci-update-status

### Dashboard Routes
- GET /api/dashboard/stats
- GET /api/dashboard/analytics?start_date={date}&end_date={date}
- GET /api/dashboard/export-excel

### Admin Routes
- GET /api/admin/users
- PUT /api/admin/users/{id}
- DELETE /api/admin/users/{id}
- POST /api/admin/users/bulk-upload
- GET /api/admin/pillars
- POST /api/admin/pillars
- DELETE /api/admin/pillars/{id}
- GET /api/admin/departments
- POST /api/admin/departments
- DELETE /api/admin/departments/{id}
- GET /api/admin/teams
- POST /api/admin/teams
- DELETE /api/admin/teams/{id}
- GET /api/admin/tech-persons
- POST /api/admin/tech-persons
- DELETE /api/admin/tech-persons/{id}
- POST /api/admin/seed-data

## Frontend Requirements

### Routing & Navigation
- Use React Router v7 with BrowserRouter
- Protected routes with authentication check
- Role-based route guards (AdminRoute, CIRoute)
- Redirect approvers without sub_role to role selection page
- Persistent Layout component with navigation sidebar

### UI Components (shadcn/ui)
Use the following shadcn/ui components:
- Button, Input, Label, Textarea, Select
- Card, Badge, Alert, AlertDialog
- Dialog, Sheet, Tabs
- Table, Dropdown Menu, Avatar
- Toast/Sonner for notifications
- Charts from Recharts library

### Pages Implementation

**Login.js**:
- Login form (username, password)
- Link to registration
- Link to forgot password
- Auto-redirect if already authenticated

**Dashboard.js**:
- Stats cards showing: Total Ideas, Pending, Approved, Declined, Revision Requested, My Ideas
- Quick actions: Submit New Idea
- Recent ideas table
- Role-based content (approvers see pending approvals)

**CIDashboard.js**:
- Only accessible to C.I. Excellence Team and Admins
- Analytics charts using Recharts:
  - Pie chart: Complexity distribution
  - Bar chart: Approval overview
- Summary cards: Quick Wins, Cost Savings, Time Saved
- Best Idea display
- Excel export button
- Date range filters

**IdeasList.js**:
- Filterable table of ideas
- Filters: Status, Pillar, Department, Team
- Click row to view details
- Status badges with color coding

**IdeaDetail.js**:
- Complete idea information
- Comments section
- Action buttons based on role:
  - Approver: Approve / Decline / Request Revision
  - C.I. Excellence: Evaluate button (opens CIEvaluationPanel)
  - User (if own idea): Edit / Resubmit (if revision requested)

**CreateIdea.js**:
- Form with all idea fields
- Cascading dropdowns (Pillar → Department → Team)
- Validation with react-hook-form
- Used for both create and edit

**AdminPanel.js**:
- Tabbed interface with 5 tabs
- Users tab: Table with CRUD, bulk CSV upload button
- Pillars/Departments/Teams tabs: Simple add/delete lists
- Tech Persons tab: Table with add/delete
- Seed Data button

**Profile.js**:
- Display user information
- Change password form
- For approvers: Sub-role selection (Approver vs C.I. Excellence)

### AuthContext Implementation
- Provides: user, login, logout, loading, token
- Stores token in localStorage
- Auto-fetch user on mount if token exists
- Axios interceptor to add Bearer token to all requests

### API Integration
- Use axios for all HTTP requests
- Base URL from environment variable (REACT_APP_API_URL)
- Automatic token injection via axios interceptors
- Error handling with toast notifications

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=philtech_eyedea
JWT_SECRET_KEY=your-secret-key-change-in-production
CORS_ORIGINS=http://localhost:3000
RESEND_API_KEY=
SENDER_EMAIL=onboarding@resend.dev
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:8000
```

## MongoDB Collections Schema

### users
```javascript
{
  id: "user_timestamp",
  username: string,
  email: string,
  password_hash: string,
  role: "user" | "approver" | "admin",
  sub_role: "approver" | "ci_excellence" | null,
  first_name: string,
  last_name: string,
  department: string,
  team: string,
  pillar: string,
  manager: string,
  approved_pillars: string[],
  approved_departments: string[],
  created_at: ISOString
}
```

### ideas
```javascript
{
  id: "idea_timestamp",
  idea_number: "EYE-00001",
  pillar: string,
  department: string,
  team: string,
  title: string,
  improvement_type: string,
  current_process: string,
  suggested_solution: string,
  benefits: string,
  target_completion: string,
  status: "pending" | "approved" | "declined" | "revision_requested" | "implemented" | "assigned_to_te",
  submitted_by: string,
  submitted_by_username: string,
  assigned_approver: string,
  assigned_approver_username: string,
  is_quick_win: boolean,
  complexity_level: "Low" | "Medium" | "High",
  savings_type: "cost_savings" | "time_saved",
  cost_savings: number,
  time_saved_hours: number,
  time_saved_minutes: number,
  evaluation_notes: string,
  assigned_to_tech: boolean,
  tech_person_name: string,
  is_best_idea: boolean,
  evaluated_by: string,
  evaluated_by_username: string,
  evaluated_at: ISOString,
  created_at: ISOString,
  updated_at: ISOString
}
```

### comments
```javascript
{
  id: "comment_timestamp",
  idea_id: string,
  user_id: string,
  username: string,
  comment_text: string,
  created_at: ISOString
}
```

### pillars
```javascript
{
  id: "pillar_timestamp",
  name: string
}
```

### departments
```javascript
{
  id: "dept_timestamp",
  name: string,
  pillar: string
}
```

### teams
```javascript
{
  id: "team_timestamp",
  name: string,
  pillar: string,
  department: string
}
```

### tech_persons
```javascript
{
  id: "tech_timestamp",
  name: string,
  email: string,
  specialization: string
}
```

## Demo Accounts
Create these test accounts on seed:
- **admin** / admin123 (Admin role)
- **approver1** / approver123 (Approver role, approved_pillars: ["GBS", "Tech"])
- **user1** / user123 (User role, department: Operations, team: Allowance Billing)

## Design Requirements

### Color Scheme
- Primary: Blue tones (not purple/indigo)
- Success: Green
- Warning: Amber/Yellow
- Error: Red
- Neutral: Gray scale

### Layout
- Fixed sidebar navigation with logo
- Main content area with padding
- Responsive breakpoints
- Clean, professional aesthetic

### Status Badge Colors
- pending: Yellow/Amber
- approved: Green
- declined: Red
- revision_requested: Orange
- implemented: Blue
- assigned_to_te: Purple

### Charts (Recharts)
- Pie Chart for complexity distribution
- Bar Chart for approval statistics
- Responsive and interactive

## Security Considerations

1. **Password Security**: Use bcrypt hashing (passlib with CryptContext)
2. **JWT Tokens**: 30-day expiration, stored in localStorage
3. **Password Reset**: 1-hour token expiration
4. **Role Validation**: Backend enforces role-based permissions
5. **CORS**: Configured to allow frontend origin
6. **Protected Routes**: Frontend guards + backend verification

## Key Business Logic

### Auto-Approver Assignment
When user submits idea, backend finds approver by:
1. Check approved_pillars array contains idea's pillar
2. OR check approved_departments array contains idea's department
3. OR check approver's own department matches idea's department

### Idea Number Generation
Format: EYE-{5-digit-number}
- Count existing ideas
- Increment by 1
- Zero-pad to 5 digits
- Example: EYE-00001, EYE-00023, EYE-00156

### C.I. Evaluation Status Changes
- If marked as Quick Win → Status becomes "implemented"
- If assigned to T&E → Status becomes "assigned_to_te"
- Otherwise → Status stays "approved"

### Analytics Calculations
- **Approval Rate** = approved / (total - declined) × 100
- **Implementation Rate** = implemented / (total - declined) × 100
- **Assigned to T&E Rate** = assigned_to_te / (total - declined) × 100

## Excel Export Format
Columns:
1. Idea Number
2. Title
3. Status
4. Pillar
5. Department
6. Team
7. Improvement Type
8. Submitted By
9. Assigned Approver
10. Quick Win
11. Complexity
12. Savings Type
13. Cost Savings
14. Time Saved (Hours)
15. Time Saved (Minutes)
16. Evaluated By
17. Tech Person
18. Best Idea
19. Target Completion
20. Created At

Use openpyxl library for generation with styled headers (blue background, white text).

## Important Implementation Notes

1. **React 19 Compatibility**: Use react-router-dom v7 for React 19 support
2. **CRACO Setup**: Required for customizing Create React App with Tailwind CSS
3. **shadcn/ui**: Install all components listed in frontend/src/components/ui/
4. **Async MongoDB**: Use Motor (motor.motor_asyncio) for async operations
5. **Email Integration**: Resend API integration (mocked if no API key)
6. **Error Handling**: Use toast notifications for all user-facing errors
7. **Loading States**: Show loading indicators during API calls
8. **Form Validation**: Use react-hook-form with zod schemas
9. **Date Handling**: Use date-fns for date formatting
10. **Comments**: Real-time comment loading on idea detail page

## Testing Checklist

After implementation, verify:
- [ ] Can register new user with all role types
- [ ] Can login and logout
- [ ] Password change works
- [ ] Forgot password generates reset link
- [ ] Reset password with valid token works
- [ ] Approver can select sub-role
- [ ] User can submit idea
- [ ] Idea auto-assigned to correct approver
- [ ] Approver can approve/decline/request revision
- [ ] User can resubmit after revision request
- [ ] C.I. Excellence can evaluate approved ideas
- [ ] Quick Win changes status to implemented
- [ ] Assign to T&E changes status correctly
- [ ] C.I. Dashboard shows correct analytics
- [ ] Excel export downloads with all data
- [ ] Admin can manage all entities
- [ ] Bulk user upload works with CSV
- [ ] Seed data creates sample content
- [ ] Comments can be added and viewed
- [ ] Filters work on ideas list
- [ ] Protected routes redirect correctly
- [ ] Role-based access is enforced

## Performance Considerations

- Use pagination for large lists (implement skip/limit on backend)
- Index MongoDB fields: username, email, idea_number, status, pillar
- Lazy load idea comments
- Memoize expensive chart calculations
- Debounce filter inputs

## Future Enhancements (Not Required Now)

- Real-time notifications (WebSocket)
- File attachments for ideas
- Email notifications via Resend
- Mobile app version
- Advanced analytics with date range filters
- Idea voting system
- Activity timeline
- Search functionality with full-text search

---

## Getting Started

After importing from GitHub:

1. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Start MongoDB (ensure running on localhost:27017)

4. Start backend:
   ```bash
   cd backend
   python server.py
   # Runs on http://localhost:8000
   ```

5. Start frontend:
   ```bash
   cd frontend
   npm start
   # Runs on http://localhost:3000
   ```

6. Login with demo account:
   - Username: admin
   - Password: admin123

7. Use "Seed Data" button in Admin Panel to populate sample data

---

This is a production-ready organizational idea management platform with comprehensive features, role-based access control, and enterprise-grade architecture.
