# Admin Trip History and Audit Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add organization-scoped Admin trip history, fleet safety scoring, and immutable audit-log pages backed by MongoDB and safe Socket.IO updates.

**Architecture:** Extend the existing analytics routes/controllers and Mongoose models. Resolve organization membership through `User` for legacy sessions, enforce Admin roles in backend middleware, and use the existing Admin layout/store/socket patterns for the UI. Keep localStorage as UI cache only; backend/MongoDB is the Admin source of truth.

**Tech Stack:** Express, Mongoose, MongoDB, Socket.IO, React, React Router, CSS Modules, existing Admin common components, Node assertion tests, Vite.

**Spec:** `docs/superpowers/specs/2026-10-23-admin-trip-history-audit-design.md`

## Global Constraints

- Only `ADMIN` and `FLEET_ADMIN` may access trips and audit APIs; reject `DRIVER` and `USER` at the backend.
- Scope every query through the authenticated Admin's `organizationId`; never trust organization IDs supplied by query/body/client socket payloads.
- Use inclusive `start_time` period filters; only sessions whose start time is in range are included.
- Include ACTIVE and COMPLETED sessions in trip history, but calculate KPI summary only from COMPLETED sessions.
- Exclude orphaned sessions and users outside the Admin's current organization.
- Use backend pagination with default 20 rows and supported limits 50/100.
- Do not add trip-history export.
- Audit records are immutable, retained indefinitely, and stored in a dedicated `auditlogs` collection with memory fallback.
- Record sensitive reads and data changes, not every filter click or render.
- Reuse existing auth, data-table, badge, toast, empty-state, CSS Module, and Socket.IO conventions.

## Review Focus

- A forged `organizationId` in query/body/socket data must not expose another organization's trips or alerts — test in Tasks 1 and 4.
- Orphaned or organization-moved legacy sessions must be excluded — test in Task 1.
- ACTIVE sessions and sessions outside the inclusive `start_time` range must be classified correctly — test in Task 1.
- Missing/negative safety scores and durations must not corrupt the summary — test in Task 1.
- Audit persistence failure must be logged without making the primary Admin action fail — test in Task 2.

---

### Task 1: Organization-scoped trip query and summary API

**Files:**
- Create: `backend/src/services/adminTripService.js`
- Modify: `backend/src/controllers/analyticsController.js`
- Modify: `backend/src/routes/analyticsRoutes.js`
- Test: `backend/test-admin-trips.js`

**Interfaces:**
- Consumes: `req.user.organizationId`, `User`, `DrivingSession`, `getIsMongoConnected`, and `memoryStore`.
- Produces: `resolveAdminTrips({ organizationId, startDate, endDate, driverId, driverSearch, status, page, limit })`, returning `{ summary, items, pagination }`; `GET /api/analytics/admin/trips`.

- [ ] **Step 1: Write failing service tests** for organization isolation, legacy user resolution, inclusive `start_time`, ACTIVE/COMPLETED classification, pagination limits, summary rules, invalid score exclusion, and negative duration clamping.
- [ ] **Step 2: Run `node backend/test-admin-trips.js`** and verify the new assertions fail because the service/route does not exist.
- [ ] **Step 3: Implement `resolveAdminTrips`** with organization membership resolved from `User`; use MongoDB queries when connected and the equivalent memory-store filtering otherwise. Clamp page/limit to 20/50/100, sort newest first, and calculate summary only from COMPLETED records.
- [ ] **Step 4: Add the authenticated Admin route** and controller response. Accept period, driver, status, page, and limit query parameters; ignore any organization query parameter and use `req.user.organizationId`.
- [ ] **Step 5: Run the focused trip test** and verify all assertions pass.
- [ ] **Step 6: Run backend syntax checks** for the service, controller, and routes.

### Task 2: Audit log model, service, and API

**Files:**
- Create: `backend/src/models/AuditLog.js`
- Create: `backend/src/services/auditLogService.js`
- Modify: `backend/src/models/index.js`
- Modify: `backend/src/db.js`
- Modify: `backend/src/controllers/analyticsController.js`
- Modify: `backend/src/routes/analyticsRoutes.js`
- Test: `backend/test-admin-audit-log.js`

**Interfaces:**
- Consumes: authenticated Admin identity and organization, `AuditLog`, `memoryStore`, and existing route actions.
- Produces: `recordAuditEvent({ actor, action, resourceType, resourceId, description, metadata })`; `GET /api/analytics/admin/audit-log` with date/action/actor/resource filters and pagination.

- [ ] **Step 1: Write failing audit tests** for schema fields, organization isolation, immutable listing order, filters, pagination, role rejection, and best-effort write behavior.
- [ ] **Step 2: Run `node backend/test-admin-audit-log.js`** and verify expected failures.
- [ ] **Step 3: Implement the `AuditLog` schema** with actor, organization, action, resource, description, metadata, and timestamp fields plus indexes for organization/time and filter fields.
- [ ] **Step 4: Implement `recordAuditEvent`** for MongoDB and memory fallback; log persistence errors explicitly and do not throw them into the primary request.
- [ ] **Step 5: Implement the scoped audit listing route/controller** for ADMIN/FLEET_ADMIN only, newest first, with server-side pagination and no delete route.
- [ ] **Step 6: Instrument existing Admin actions** for page-open trip/audit views, incident resolution, and employee create/update/delete using the service.
- [ ] **Step 7: Run focused audit tests and backend syntax checks**; verify all assertions pass.

### Task 3: Secure Socket.IO organization context and trip lifecycle updates

**Files:**
- Modify: `backend/src/server.js`
- Modify: `backend/src/socket/telemetryHandler.js`
- Modify: `frontend/src/api/socket.js`
- Modify: `frontend/src/pages/driver/DriverCamera.jsx`
- Test: `backend/test-socket-organization-scope.js`

**Interfaces:**
- Consumes: existing Socket.IO connection, JWT auth middleware conventions, and session lifecycle payloads.
- Produces: authenticated organization room joins and `trip:lifecycle` events containing only safe session identifiers/status.

- [ ] **Step 1: Write failing socket tests** proving a client cannot join a forged organization room and that ACTIVE/COMPLETED lifecycle events reach only the matching organization room.
- [ ] **Step 2: Run the socket test** and verify it fails with the current client-supplied organization behavior.
- [ ] **Step 3: Add socket authentication context** using the existing JWT secret/token format and derive organization from the authenticated user; reject or isolate clients without valid context.
- [ ] **Step 4: Emit lifecycle events** after session create/update/end without changing telemetry batching behavior.
- [ ] **Step 5: Update driver socket/session lifecycle calls** to use authenticated socket context and emit the event payload.
- [ ] **Step 6: Run socket tests and backend syntax checks**.

### Task 4: Admin trip history page and navigation

**Files:**
- Create: `frontend/src/pages/admin/AdminTrips.jsx`
- Create: `frontend/src/pages/admin/AdminTrips.module.css`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/admin/AdminLayout.jsx`
- Test: `frontend/test-admin-trips.mjs`

**Interfaces:**
- Consumes: `GET /api/analytics/admin/trips`, `trip:lifecycle`, `useAuth`, existing table/badge/empty-state components.
- Produces: `/admin/trips` with period/status/driver filters, refresh, paginated rows, summary KPI, ACTIVE badge, and empty-state links.

- [ ] **Step 1: Write the focused UI contract test** for empty-state copy, KPI exclusion of ACTIVE sessions, organization-safe request parameters, and pagination controls.
- [ ] **Step 2: Run the test** and verify it fails because the route/page does not exist.
- [ ] **Step 3: Implement the page** with default seven-day filter, 30-day/all-history choices, exact driver dropdown plus name/email search, status filter, 20/50/100 page size, refresh, and responsive table/card presentation.
- [ ] **Step 4: Add the fleet score panel** showing `-- / 100` and the exact empty-state guidance when no COMPLETED data exists.
- [ ] **Step 5: Register `/admin/trips` and sidebar navigation** while preserving existing Admin routes.
- [ ] **Step 6: Subscribe to `trip:lifecycle`** and refresh the affected page data; keep a manual refresh button.
- [ ] **Step 7: Run frontend test, lint, and build**.

### Task 5: Admin audit-log page and final integration

**Files:**
- Create: `frontend/src/pages/admin/AdminAuditLog.jsx`
- Create: `frontend/src/pages/admin/AdminAuditLog.module.css`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/admin/AdminLayout.jsx`
- Modify: `README.md`
- Test: `frontend/test-admin-audit-log.mjs`

**Interfaces:**
- Consumes: `GET /api/analytics/admin/audit-log`, existing Admin auth, table, badges, and toast patterns.
- Produces: `/admin/audit-log` with date/action/actor/resource filters, immutable read-only rows, pagination, and empty/loading/error states.

- [ ] **Step 1: Write failing UI tests** for organization-scoped request construction, filter controls, newest-first rendering, and no-delete UI.
- [ ] **Step 2: Run the test** and verify it fails before the page exists.
- [ ] **Step 3: Implement the audit page** with responsive rows, metadata details, filters, 20/50/100 pagination, loading/error/empty states, and no destructive controls.
- [ ] **Step 4: Register the route/sidebar link** and ensure only authorized roles can reach it through backend enforcement.
- [ ] **Step 5: Document the two Admin pages, API scope, KPI rules, and audit retention** in `README.md`.
- [ ] **Step 6: Run the focused frontend test, full relevant backend tests, frontend lint, frontend build, and `git diff --check`.**

### Task 6: End-to-end verification

**Files:**
- Modify only files required by failing verification.

- [ ] **Step 1: Run Admin analytics regression tests** including existing Admin analytics/chatbot tests and the new trip/audit tests.
- [ ] **Step 2: Run the frontend lint and production build**.
- [ ] **Step 3: Manually verify the flow** with two organizations: create/end a driver session, observe `/admin/trips`, confirm KPI, open `/admin/audit-log`, and verify a forged organization parameter is ignored.
- [ ] **Step 4: Review `git diff --check` and changed-file status**; report unrelated pre-existing modifications without reverting them.
