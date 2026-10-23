# Admin Trip History and Audit Log Design

## Intent

Give Admin users a reliable view of every driving session belonging to their
organization, plus a trace of sensitive administrative actions. The backend
and MongoDB remain the source of truth so the Admin safety score is based on
real persisted sessions rather than browser-local demo data.

## Goals

- Add `/admin/trips` with organization-scoped driving sessions.
- Show ACTIVE and COMPLETED sessions, newest first, with backend pagination.
- Calculate the fleet safety score from COMPLETED session `safety_score` values.
- Return a summary alongside paginated trip items.
- Add `/admin/audit-log` backed by a dedicated `auditlogs` collection.
- Scope both features to the authenticated Admin's organization.
- Record sensitive reads and data-changing Admin actions.
- Update trip state lightly through Socket.IO, with an explicit refresh action.
- Provide useful empty states when no sessions exist.

## Non-goals

- No export feature for trip history.
- No migration that rewrites all legacy sessions.
- No audit tracking for every filter click or ordinary UI render.
- No changes to driver-facing session creation semantics beyond emitting the
  existing lifecycle events needed for Admin refresh.

## Anti-goals

- Never use localStorage demo trips as Admin analytics truth.
- Never allow an Admin to query another organization by changing query params.
- Never include ACTIVE sessions in the safety-score KPI.
- Never store audit records inside users, sessions, or chat conversations.

## Approach

### A — Extend the existing analytics API (selected)

Add organization-scoped trip and audit endpoints to the current Express
analytics route/controller structure. Reuse the existing authentication
middleware, `DrivingSession`, `User`, Admin layout, and Socket.IO server.

Approach B (a separate Admin Operations module) would create cleaner future
boundaries but adds unnecessary surface area and duplicates current scoping
patterns. Approach C (frontend-only/localStorage) cannot satisfy persistence,
pagination, auditability, or isolation.

## Decisions

- The Admin sidebar gets separate links for Trips and Audit Log.
- Trip columns: driver, email, start/end, duration, safety score, drowsy,
  yawning, distracted, peak alert level, and status.
- Mobile uses a stacked detail presentation rather than forcing a wide table.
- The default period is seven days; 30 days and all history are available.
- Admin can filter by driver and status. Trip history is not exported.
- Pagination is server-side with 20 rows by default and 50/100 options.
- The trip endpoint returns `summary` and paginated `items`.
- The score is the simple average of COMPLETED session scores. Empty data
  renders “Chưa có dữ liệu chuyến đi...” and links to employee/camera pages.
- Legacy sessions are scoped by resolving their `user_id` to an organization;
  they are not bulk-migrated only to add `organizationId`.
- Legacy sessions are included only when the current user lookup resolves to
  the Admin's organization. Orphaned users and users that moved organizations
  are excluded.
- Only ADMIN and FLEET_ADMIN may access the trips and audit APIs. DRIVER and
  USER requests are rejected by backend authorization, not only hidden in the
  UI.
- Audit records contain actor, organization, action, resource type/id,
  description, metadata JSON, and timestamp. IP/user-agent are out of scope.
- Audit actions include viewing trips/audit log, resolving incidents, and
  creating/updating/deleting employees. A page view records once per opening.
- Audit listing is organization-scoped and available to ADMIN/FLEET_ADMIN only.
- Trip lifecycle changes publish a Socket.IO event; the page also has Refresh.
- Socket room joins and organization broadcasts must use authenticated socket
  organization context rather than trusting a client-supplied organization ID.
- Period filters use inclusive `start_time` boundaries. A session is included
  when its start time is in the selected range; an ACTIVE session that began
  before the range is excluded.
- Summary duration and critical-alert counts include COMPLETED sessions only.
  Invalid or missing scores are excluded from the average, and negative
  durations contribute zero.
- Driver filtering supports an exact driver ID and name/email search, limited
  to organization drivers.
- Audit listing supports date range, action, actor, and resource type filters,
  newest first. Audit records are immutable, retained indefinitely, and have
  no delete action.

## Data and API shape

The trip endpoint will accept period, driver, status, page, and limit filters
and return:

```json
{
  "success": true,
  "summary": {
    "completedSessions": 0,
    "activeSessions": 0,
    "averageSafetyScore": null,
    "criticalAlerts": 0,
    "totalDurationSeconds": 0
  },
  "items": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 0 }
}
```

The audit endpoint returns organization-scoped records with the same
pagination shape. Audit writes must be best-effort and must not make the
primary user action fail solely because audit persistence is unavailable;
the failure is logged explicitly.

## Open builder calls

- Preserve the project's existing CommonJS/ESM and CSS Module conventions.
- Use existing table, badge, toast, and empty-state components where they fit.
- Add focused backend tests for scope, pagination, summary, and audit writes,
  plus frontend build/lint verification.
