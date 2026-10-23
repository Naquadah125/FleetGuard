# FleetGuard Profile Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure self-service profile editing and password changes to both Admin and Driver/User dropdowns, with database persistence and audit coverage.

**Architecture:** Extend the authenticated `/api/auth/me` surface with a self-only update endpoint. Reuse one `ProfilePage` component behind `/admin/profile` and `/driver/profile`, while each layout adds only its own navigation entry. Keep the backend as source of truth and synchronize `AuthContext` after a successful save.

**Tech Stack:** React 19, React Router, Express, Mongoose, bcrypt, CSS Modules, existing AuthContext/toast/audit services.

**Spec:** `docs/superpowers/specs/2026-10-23-profile-editing-design.md`

## Global Constraints

- “Backend-authenticated accounts are required for this feature; mock/local fallback accounts do not receive a false-success local-only update.”
- “Phone is required and must be a Vietnamese 10-digit number beginning with `0`.”
- “Date of birth is entered and stored as `DD-MM-YYYY`; the date must represent an age from 16 through 100.”
- “Profile and password validation is atomic: invalid password input leaves all profile fields unchanged.”
- “The API rejects attempts to change email, organization, role, or other protected fields.”
- “Audit action is `UPDATE_PROFILE`; metadata contains changed field names only.”
- Password values must never be stored in audit metadata, logs, responses, or local storage.
- Preserve existing role guards, CSS Module conventions, and unrelated worktree changes.

## Review Focus

- A forged update target or protected field must not let one user edit another account; pin this in the backend self-only authorization test in Task 1.
- Invalid current password must leave name/phone/date/avatar unchanged; pin atomicity in Task 1.
- Existing users without the new profile fields must receive safe defaults and a usable form; pin normalization in Task 1.
- Both role routes must render the same page without making the wrong role accessible; pin route registration in Task 2.
- Refreshing after save must show persisted values rather than stale localStorage; pin AuthContext synchronization in Task 2.

---

### Task 1: Add authenticated profile update API

**Files:**
- Modify: `backend/src/models/User.js`
- Modify: `backend/src/routes/authRoutes.js`
- Modify: `backend/src/services/auditLogService.js` only if a shared audit helper is needed
- Test: `backend/test-profile-update.js`

**Interfaces:**
- Consumes: existing `requireAuth`, `User`, bcrypt, and `recordAuditEvent`.
- Produces: `PUT /api/auth/me` returning `{ success: true, user }` with no `passwordHash`; accepts `name`, `phone`, `dateOfBirth`, `avatarColor`, and optional password fields.

- [ ] **Step 1: Write the failing backend tests**

  Add focused cases:
  - updates name, phone, `DD-MM-YYYY` date of birth, and avatar color for the authenticated user;
  - rejects missing/invalid Vietnamese phone numbers and dates outside age 16–100;
  - rejects email, role, organization, and unknown protected-field changes;
  - requires current password, matching new password/confirmation, and minimum six-character new password;
  - leaves all profile fields unchanged when password validation fails;
  - returns a sanitized user and records `UPDATE_PROFILE` with only changed field names;
  - rejects a request when the authenticated user no longer exists.

- [ ] **Step 2: Run the backend test to verify it fails**

  Run: `node backend/test-profile-update.js`

  Expected: FAIL because `PUT /api/auth/me` and the new profile fields do not exist.

- [ ] **Step 3: Implement the minimal API**

  Add optional `phone`, `dateOfBirth`, and `avatarColor` fields to the User schema with safe defaults. Implement `PUT /me` after re-fetching the user by authenticated ID so password verification has access to `passwordHash`. Validate all fields before mutating any document, normalize the date string, update the password hash only when all password fields are present and valid, and call the existing best-effort audit service with `metadata.changedFields`.

- [ ] **Step 4: Run the backend test to verify it passes**

  Run: `node backend/test-profile-update.js`

  Expected: PASS for validation, atomicity, sanitization, audit shape, and missing-user cases.

- [ ] **Step 5: Run related backend regressions**

  Run: `node backend/test-admin-audit-log.js; node --check backend/src/routes/authRoutes.js`

  Expected: PASS with no syntax errors.

- [ ] **Step 6: Commit**

  ```bash
  git add backend/src/models/User.js backend/src/routes/authRoutes.js backend/test-profile-update.js
  git commit -m "feat: add self-service profile update API"
  ```

### Task 2: Build the shared profile page and role routes

**Files:**
- Create: `frontend/src/pages/profile/ProfilePage.jsx`
- Create: `frontend/src/pages/profile/ProfilePage.module.css`
- Create: `frontend/test-profile-page.mjs`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/context/AuthContext.jsx`
- Modify: `frontend/src/pages/admin/AdminLayout.jsx`
- Modify: `frontend/src/pages/driver/DriverLayout.jsx`

**Interfaces:**
- Consumes: `PUT /api/auth/me` from Task 1, `AuthContext`, existing toast and layout shells.
- Produces: profile navigation from both dropdowns and a shared profile form at `/admin/profile` and `/driver/profile`.

- [ ] **Step 1: Write the failing frontend contract test**

  Assert that the application source registers both role routes, both layouts expose “Chỉnh sửa thông tin”, the profile payload contains `name`, `phone`, `dateOfBirth`, and `avatarColor`, and the email input is read-only.

- [ ] **Step 2: Run the frontend contract test to verify it fails**

  Run: `node frontend/test-profile-page.mjs`

  Expected: FAIL because the profile page and routes do not exist.

- [ ] **Step 3: Implement `ProfilePage`**

  Create one responsive page with sections for profile fields and password change. Use controlled fields, client-side validation matching the backend, visible loading/error/success states, disabled save while submitting, and a back link to the role’s dashboard. Keep email visible but read-only. Submit only the supported fields to `/api/auth/me`, then update AuthContext/localStorage from the sanitized response and clear password inputs.

- [ ] **Step 4: Register role routes and dropdown links**

  Register `/admin/profile` and `/driver/profile` with the existing role route guards. Add a dropdown button in both layouts that closes the menu and navigates to the corresponding route.

- [ ] **Step 5: Run the frontend contract test to verify it passes**

  Run: `node frontend/test-profile-page.mjs`

  Expected: PASS.

- [ ] **Step 6: Run frontend lint and build**

  Run: `npm --prefix frontend run lint; npm --prefix frontend run build`

  Expected: build succeeds; only documented pre-existing warnings remain.

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/App.jsx frontend/src/context/AuthContext.jsx frontend/src/pages/admin/AdminLayout.jsx frontend/src/pages/driver/DriverLayout.jsx frontend/src/pages/profile frontend/test-profile-page.mjs
  git commit -m "feat: add shared profile editing page"
  ```

### Task 3: Verify the complete profile flow

**Files:**
- Modify: `.superpowers/sdd/profile-editing/progress.md` if the execution ledger is used
- Test: `backend/test-profile-update.js`
- Test: `frontend/test-profile-page.mjs`

**Interfaces:**
- Consumes: completed API and page from Tasks 1–2.
- Produces: verified persisted profile flow and a clean implementation handoff.

- [ ] **Step 1: Run focused tests together**

  Run: `node backend/test-profile-update.js; node frontend/test-profile-page.mjs`

  Expected: all focused tests pass.

- [ ] **Step 2: Run existing regressions**

  Run: `node backend/test-admin-trips.js; node backend/test-admin-audit-log.js; node backend/test-socket-organization-scope.js`

  Expected: all existing Admin trip/audit/socket tests pass.

- [ ] **Step 3: Run final checks**

  Run: `npm --prefix frontend run lint; npm --prefix frontend run build; git diff --check`

  Expected: build succeeds and no whitespace errors are reported.

- [ ] **Step 4: Manually verify both role flows**

  With backend and frontend running, open each dropdown, navigate to its role profile route, edit the four profile fields, refresh, and confirm values persist. Test an invalid current password and confirm no profile field changes. Confirm audit log shows `UPDATE_PROFILE` with field names only.

- [ ] **Step 5: Commit any final verification-only ledger update**

  ```bash
  git add .superpowers/sdd/profile-editing/progress.md
  git commit -m "test: verify profile editing flow"
  ```
