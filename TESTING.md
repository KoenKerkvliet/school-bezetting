# Testing Checklist - School Bezetting Authentication System

## Setup
- [ ] Dev server draait op http://localhost:5175
- [ ] Supabase project is geconfigureerd met correcte credentials
- [ ] Database tabellen zijn aangemaakt en data is ingevoerd

---

## Test 1: Login Flow

### 1.1 First Visit (No User)
- [ ] Navigeer naar http://localhost:5175
- [ ] Verwacht: LoginPage wordt weergegeven
- [ ] Controleer: Email input, Password input, Remember me checkbox, Forgot password link

### 1.2 Invalid Credentials
- [ ] Email: `test@example.com`
- [ ] Password: `wrongpassword`
- [ ] Click: "Inloggen"
- [ ] Verwacht: Error message verschijnt

### 1.3 Valid Admin Login
- [ ] Heb je een admin account aangemaakt in Supabase?
- [ ] Email: (admin email)
- [ ] Password: (admin password)
- [ ] Click: "Inloggen"
- [ ] Verwacht:
  - [ ] LoginPage verdwijnt
  - [ ] EmailVerificationPage verschijnt (if email not verified)
  - [ ] Of Dashboard verschijnt (if email already verified)

---

## Test 2: Email Verification

### 2.1 Verification Page
- [ ] Controleer: Email adres wordt weergegeven
- [ ] Controleer: "Verificatie email opnieuw verzenden" button is zichtbaar
- [ ] Controleer: Info box met tips

### 2.2 Resend Email
- [ ] Click: "Verificatie email opnieuw verzenden"
- [ ] Verwacht: Countdown timer van 60 seconden verschijnt
- [ ] Controleer: Supabase email inbox (check spam folder!)

### 2.3 Email Verification (Manual)
- [ ] In Supabase: Manually verify the email for your test user
  - Go to: Supabase Dashboard → Authentication → Users
  - Find your test user → Click → "Edit User"
  - Set "Email confirmed at" to current timestamp
  - Save
- [ ] Refresh page
- [ ] Verwacht: Success message, then redirected to Dashboard

---

## Test 3: Dashboard Access

### 3.1 After Login
- [ ] Controleer: Navbar is zichtbaar met:
  - [ ] School Planning logo
  - [ ] Dashboard / Collega's / Groepen tabs
  - [ ] Admin link (only if Admin role)
  - [ ] User email in top right
  - [ ] User role in top right
  - [ ] Logout button

### 3.2 Dashboard Content
- [ ] Controleer: Dashboard page is zichtbaar
- [ ] Controleer: Data (groups, staff, etc.) is geladen
- [ ] Controleer: No console errors (F12 → Console)

### 3.3 Navigation
- [ ] Click: "Collega's" tab
- [ ] Verwacht: StaffPage is zichtbaar
- [ ] Click: "Groepen" tab
- [ ] Verwacht: GroupsPage is zichtbaar
- [ ] Click: "Dashboard" tab
- [ ] Verwacht: Dashboard is weer zichtbaar

---

## Test 4: Admin Dashboard (Admin Role Only)

### 4.1 Access Admin Panel
- [ ] Controleer: "Admin" link is zichtbaar in navbar (only if Admin)
- [ ] Click: "Admin" link
- [ ] Verwacht: AdminDashboard verschijnt

### 4.2 Admin Overview Tab
- [ ] Controleer: 3 stat cards zijn zichtbaar:
  - [ ] Users count
  - [ ] Staff count
  - [ ] Groups count
- [ ] Controleer: Info box met instructies

### 4.3 User Management Tab
- [ ] Click: "Gebruikers beheren" tab
- [ ] Verwacht: User list wordt weergegeven
- [ ] Controleer: Columns: Name, Email, Role, Status, Actions

### 4.4 Create New User
- [ ] Click: "+ Nieuwe gebruiker"
- [ ] Verwacht: Form verschijnt
- [ ] Vul in:
  - [ ] Email: `newuser@example.com`
  - [ ] First name: `Test`
  - [ ] Last name: `User`
  - [ ] Role: `Editor`
- [ ] Click: "Gebruiker aanmaken"
- [ ] Verwacht:
  - [ ] User verschijnt in lijst
  - [ ] Status: "⏳ In afwachting" (email not verified)
  - [ ] Email is verzonden (check Supabase email inbox)

### 4.5 Update User Role
- [ ] Klik op Role (bijv. "Editor")
- [ ] Verwacht: Dropdown verschijnt
- [ ] Selecteer: "Admin"
- [ ] Verwacht:
  - [ ] Role update is gesaved
  - [ ] Dropdown sluit
  - [ ] Role is updated in table

### 4.6 Delete User
- [ ] Find any non-critical test user
- [ ] Click: "Verwijderen"
- [ ] Verwacht: Confirmation dialog
- [ ] Click: "OK"
- [ ] Verwacht: User is verwijderd uit lijst

---

## Test 5: Permission Guards (Editor & Viewer Roles)

### 5.1 Create Editor User
- [ ] In admin panel: Create new user with role "Editor"
- [ ] Verify email (in Supabase)
- [ ] Login with this account
- [ ] Navigate to Dashboard

### 5.2 Editor Permissions
- [ ] Controleer: Can view all data
- [ ] Controleer: Can see edit buttons (if implemented)
- [ ] Controleer: NO admin link in navbar
- [ ] Controleer: NO delete buttons for groups (if restricted)

### 5.3 Create Viewer User
- [ ] In admin panel: Create new user with role "Viewer"
- [ ] Verify email (in Supabase)
- [ ] Login with this account
- [ ] Navigate to Dashboard

### 5.4 Viewer Permissions
- [ ] Controleer: Can view all data
- [ ] Controleer: NO edit buttons
- [ ] Controleer: NO delete buttons
- [ ] Controleer: NO create buttons
- [ ] Controleer: NO admin link in navbar

---

## Test 6: Multi-Tenant Isolation

### 6.1 Setup Two Organizations
- [ ] In Supabase: Create second organization
  - Table: organizations
  - Insert: `{ name: "School B", slug: "school-b" }`
- [ ] Create staff/groups for School B with `organization_id` of second org

### 6.2 Login with User from School A
- [ ] Login as admin from first organization
- [ ] Check: Dashboard shows only School A data
- [ ] Controleer: Groups are only from School A
- [ ] Controleer: Staff are only from School A

### 6.3 Create User in School B
- [ ] (Requires second admin account for School B, or manual insert)
- [ ] Login as admin from School B
- [ ] Check: Dashboard shows only School B data
- [ ] Controleer: Different groups/staff than School A

### 6.4 Data Isolation Verification
- [ ] Open browser DevTools (F12)
- [ ] Network tab
- [ ] Make API calls in School A
- [ ] Controleer: All queries include `organization_id` filter
- [ ] Switch to School B
- [ ] Controleer: Different `organization_id` in queries

---

## Test 7: Session & Logout

### 7.1 Logout
- [ ] Click: Logout button (red icon in navbar)
- [ ] Verwacht:
  - [ ] Redirected to LoginPage
  - [ ] All user data is cleared
  - [ ] No console errors

### 7.2 Session Persistence
- [ ] Login again
- [ ] Refresh page (F5)
- [ ] Verwacht:
  - [ ] Dashboard still visible (session persists)
  - [ ] No re-login required
  - [ ] User info still in navbar

### 7.3 Remember Email
- [ ] Logout
- [ ] Controleer: Email field is empty (remember disabled by default)
- [ ] Login with: Email + Password, CHECK "Email onthouden"
- [ ] Logout
- [ ] Verwacht: Email is prefilled in login form
- [ ] Uncheck "Email onthouden"
- [ ] Logout & Login
- [ ] Verwacht: Email is NOT prefilled anymore

---

## Test 8: Error Handling

### 8.1 Network Error Handling
- [ ] Open DevTools (F12) → Network
- [ ] Throttle to "Offline"
- [ ] Try to login
- [ ] Verwacht: Error message appears
- [ ] Set back to "Online"
- [ ] Try again
- [ ] Verwacht: Login succeeds

### 8.2 Console Errors
- [ ] Open DevTools (F12) → Console
- [ ] Perform all above tests
- [ ] Verwacht: NO red errors in console
- [ ] Note: Yellow warnings are OK

---

## Test 9: UI/UX

### 9.1 Responsive Design
- [ ] Open DevTools (F12) → Responsive Design Mode
- [ ] Test on: Mobile (375px), Tablet (768px), Desktop (1280px)
- [ ] Verwacht: All pages look good on all sizes
- [ ] Controleer: Navbar adapts correctly

### 9.2 Loading States
- [ ] Check: Spinning loaders appear while data loads
- [ ] Controleer: Disabled buttons during form submission
- [ ] Controleer: Loading text updates appropriately

### 9.3 Accessibility
- [ ] Controleer: Can tab through form fields
- [ ] Controleer: Can use Enter to submit forms
- [ ] Controleer: Labels are associated with inputs
- [ ] Controleer: Color contrast is adequate (blue on white, etc.)

---

## Test Summary

### Passing Criteria
- [ ] All login flows work correctly
- [ ] Email verification is required
- [ ] Admin dashboard functions properly
- [ ] User roles are enforced
- [ ] Multi-tenant isolation works
- [ ] Session persists on refresh
- [ ] Logout clears all data
- [ ] No console errors
- [ ] Responsive on all screen sizes

### Known Issues / Notes
- Note any issues found here:
  -
  -
  -

---

## Next Steps if All Pass
1. ✅ Run full test suite above
2. ✅ Fix any bugs found
3. ✅ Mark Phase 8 as complete
4. ✅ Push final changes to GitHub
5. ✅ Project is production-ready for further development!

---

**Happy Testing!** 🚀
