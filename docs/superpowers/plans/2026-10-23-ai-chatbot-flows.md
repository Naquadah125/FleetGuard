# FleetGuard AI Chatbot Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make User and Admin chatbot answers use Gemini on successful requests while sourcing analytics from authenticated FleetGuard records.

**Architecture:** Extend the shared `ChatService` and Gemini tool layer. User tools remain scoped to the authenticated User; an Admin analytics tool receives only a constrained intent/period and the backend supplies the authenticated Admin's organization. Internal data remains the source of metrics, and Gemini explains the tool result.

**Tech Stack:** Node.js ES modules, Express, Mongoose, `@google/genai`, React/Vite.

**Spec:** `docs/superpowers/specs/2026-10-23-ai-chatbot-flows-design.md`

## Global Constraints

- User analytics are limited to the authenticated User's own records.
- Admin analytics include users belonging to the authenticated Admin's organization only.
- MongoDB/internal analytics remain the source of numeric results; Gemini selects approved tools and explains returned data, not invents metrics.
- Missing Gemini configuration and exhausted provider attempts return explicit errors, never a successful internal-only answer.
- `GEMINI_API_KEY`, `GEMINI_MODEL`, and `GEMINI_MODELS` remain backend-only.
- Do not change the AI scanning/computer-vision pipeline.

## Review Focus

- A missing key returns a non-success response even when internal analytics are available — Task 2 API test.
- Quota, unavailable model, and timeout after configured model failover return an explicit error without a local success reply — Task 2 ChatService tests.
- A User cannot use Gemini arguments to read another user's sessions, telemetry, or video — Tasks 1 and 2 tool-scope tests.
- An Admin cannot use model-provided organization/driver IDs to escape their organization — Tasks 1 and 2 organization-scope tests.
- Empty data still produces a Gemini explanation of a structured no-data result, not an invented answer — Task 2 Admin tool-flow test.

---

### Task 1: Resolving scoped User and Admin analytics

**Files:**
- Create: `backend/src/services/userAnalyticsService.js`
- Test: `backend/test-user-analytics.js`
- Modify: `backend/src/services/adminAnalyticsService.js`
- Test: `backend/test-admin-analytics.js`

**Interfaces:**
- Consumes: `DrivingSession` records for User session summaries; `DrivingSession`, `EmotionLog`, and `VideoAnalysis` records for Admin analytics.
- Produces: `resolveUserAnalytics({ userId, requestedDays, startDate, endDate, sessionId, now, sessions })` returning a `user_safety_summary` with `period`, `recordsUsed.sessions`, and metrics for session count, average safety score, drowsy/yawn/distracted counts, critical/warning alerts, and duration; `resolveAdminAnalytics({ organizationId, intent, requestedDays, ... })` includes organization-scoped video records.

- [ ] **Step 1: Write failing User ownership and summary tests**

Add `test_user_summary_filters_owner_and_default_period` with fixtures for two
users and their sessions. Assert
`resolveUserAnalytics` includes only the authenticated user's records, counts
the specified session metrics, uses the last 7 days by default, and honors an
explicit session ID or date range.

- [ ] **Step 2: Run User analytics tests and verify they fail**

Run from `FleetGuard/backend`: `node test-user-analytics.js`

Expected: FAIL because `resolveUserAnalytics` does not exist.

- [ ] **Step 3: Implement the User analytics resolver**

Add `resolveUserAnalytics` to query only the authenticated user's
`DrivingSession` records (and use injected fixtures for unit tests), apply the
default 7-day period or an explicit period/session filter, and return the
defined summary shape. Keep emotion and video detail in their existing tools.

- [ ] **Step 4: Run User analytics tests and verify they pass**

Run from `FleetGuard/backend`: `node test-user-analytics.js`

Expected: PASS with only the authenticated user's records included.

- [ ] **Step 5: Write a failing Admin video-scope test**

Add `test_admin_video_records_are_organization_scoped` with a `videos` fixture
containing one `VideoAnalysis` for an `org-a` driver and one for an `org-b`
driver. Assert resolving analytics for `org-a` includes only its video in
`recordsUsed.videos`.

- [ ] **Step 6: Run Admin analytics tests and verify they fail**

Run from `FleetGuard/backend`: `node test-admin-analytics.js`

Expected: FAIL because the current MongoDB service path does not load
`VideoAnalysis` records.

- [ ] **Step 7: Load and filter Admin video records**

Update `resolveAdminAnalytics` to fetch videos for the organization's driver
IDs in the MongoDB path, retain the existing fixture/memory-store path, and
apply the selected period and driver scope before returning analytics.

- [ ] **Step 8: Run Admin analytics tests and verify they pass**

Run from `FleetGuard/backend`: `node test-admin-analytics.js`

Expected: PASS with only the organization's videos counted.

---

### Task 2: Requiring Gemini for both chatbot roles

**Files:**
- Modify: `ai-chatbot/src/tools.js`
- Modify: `ai-chatbot/src/chatService.js`
- Modify: `ai-chatbot/src/systemPrompt.js`
- Modify: `ai-chatbot/test/test-chatbot.js`
- Modify: `ai-chatbot/test/test-model-failover.js`
- Modify: `backend/src/controllers/analyticsController.js`
- Modify: `backend/test-chatbot.js`
- Modify: `backend/test-admin-chatbot-api.js`

**Interfaces:**
- Consumes: Task 1's `resolveUserAnalytics` and `resolveAdminAnalytics` data behavior.
- Produces: `ChatService.sendMessage(message, user, conversationHistory, requestOptions)` using role-specific Gemini tools; User requests receive a `userAnalyticsResolver({ requestedDays, sessionId })` callback backed by the authenticated User's ID, and Admin requests receive an `adminAnalyticsResolver({ intent, requestedDays })` callback backed by the authenticated Admin's organization. Missing configuration throws `GEMINI_NOT_CONFIGURED`; exhausted model attempts throw a sanitized Gemini provider error.

- [ ] **Step 1: Write failing ChatService tests for strict Gemini and Admin tool flow**

Update `ai-chatbot/test/test-chatbot.js` and
`ai-chatbot/test/test-model-failover.js` with named tests
`missing_api_key_throws_configuration_error`,
`user_summary_tool_uses_authenticated_identity`,
`admin_analytics_tool_uses_server_resolver`,
`no_data_admin_result_is_interpreted_by_gemini`, and
`provider_exhaustion_throws_without_internal_fallback`. Assert:

```js
assert.equal(error.code, 'GEMINI_NOT_CONFIGURED');
assert.deepEqual(adminToolCalls, [{ intent: 'alerts', requestedDays: 7 }]);
assert.equal(result.modelStatus.source, 'gemini');
```

Cover a quota/timeout failure after configured model attempts, a User
function call whose `driver_id` differs from the authenticated identity, an
Admin function call that receives no model-supplied organization ID, and an
Admin no-data tool result that is sent to Gemini for explanation. Replace
existing assertions that require local fallback.

- [ ] **Step 2: Run ChatService tests and verify they fail**

Run from `FleetGuard/ai-chatbot`:
`node test/test-chatbot.js` and `node test/test-model-failover.js`

Expected: FAIL because current failure paths return local fallback answers and
Admin intent/interpretation bypasses a Gemini analytics tool call.

- [ ] **Step 3: Add constrained User and Admin tool declarations and execution paths**

In `ai-chatbot/src/tools.js`, define `get_user_safety_summary` with optional
`requested_days`, `start_date`, `end_date`, and `session_id`, and
`resolve_admin_analytics` with an allowed intent (`overview`, `alerts`,
`emotions`, or `ranking`) and optional `requested_days`. Execute them only
through the supplied server-side resolvers; do not accept organization or
user identity from model arguments. Treat tool errors as failures rather than
returning them to Gemini as if they were data.

- [ ] **Step 4: Use role-specific Gemini tools and remove success fallbacks**

In `ChatService`, expose only User tools to User roles and only the Admin
analytics tool to Admin roles. Keep multi-model failover for retryable
provider errors. When configuration is absent or all model attempts fail,
throw a typed error; do not call `_fallbackLocalCopilot` or produce a
success-shaped internal answer. Require data questions to use their approved
tool, then pass structured results (including no-data results) to Gemini.

- [ ] **Step 5: Write failing route tests for missing configuration**

Update `backend/test-chatbot.js` and `backend/test-admin-chatbot-api.js` with
`user_chatbot_returns_503_without_gemini_key` and
`admin_chatbot_returns_503_without_gemini_key`. Clear/restore
`GEMINI_API_KEY` around requests and assert both roles receive
`success: false` with HTTP 503. Remove the old expectation that a missing key
returns successful local analytics.

- [ ] **Step 6: Route both roles through the shared Gemini flow**

In `chatWithSafetyAdvisor`, set `requireGemini: true` for User and Admin
requests. For User, provide a resolver that calls `resolveUserAnalytics` with
the authenticated User ID and requested/default period (7 days). For Admin,
provide a resolver that calls `resolveAdminAnalytics` with
`req.user.organizationId`, Gemini's allowed intent, and the requested/default
period (7 days, then 30 days, then all organization history only when no
usable records exist). Map missing configuration to HTTP 503 and exhausted
provider failures to HTTP 502 with a safe message. Do not persist a model
reply for a failed request.

- [ ] **Step 7: Run route and service tests**

Run from the repository root:

```powershell
Set-Location FleetGuard\ai-chatbot
node test\test-chatbot.js
node test\test-model-failover.js
Set-Location ..\backend
node test-user-analytics.js
node test-admin-analytics.js
node test-chatbot.js
node test-admin-chatbot-api.js
```

Expected: all targeted tests PASS; failures do not return success-shaped
responses.

---

### Task 3: Documenting the shared AI flow

**Files:**
- Create: `docs/superpowers/guide/ai-chatbot-flows.md`
- Modify: `ai-chatbot/README.md`
- Modify: `docs/superpowers/guide/user-gemini-chatbot.md`
- Modify: `docs/superpowers/specs/2026-10-23-user-gemini-chatbot-design.md`
- Modify: `docs/superpowers/specs/2026-10-23-admin-ai-assistant-design.md`

**Interfaces:**
- Consumes: Task 2's final role-specific request, tool, response, and error behavior.
- Produces: a single Mermaid flow for User and Admin plus consistent setup, data-source, model-failure, and security guidance in related documents.

- [ ] **Step 1: Create the shared flow guide**

Document the User and Admin request paths, `DrivingSession`/
`EmotionLog`/`VideoAnalysis` data sources, authenticated scope, Gemini function
calling, structured response, and explicit missing-key/provider failure
behavior. Include the 7-day User default and Admin 7-day → 30-day → all-history
expansion.

- [ ] **Step 2: Reconcile existing AI documentation**

Replace claims that missing/unavailable Gemini silently falls back to a
successful local chatbot response. Align the User guide and User/Admin specs
with the shared guide and link to it from the AI chatbot README.

- [ ] **Step 3: Review documentation consistency**

Search the touched Markdown files for fallback claims, Admin/User scope,
model requirements, and data sources. Expected: no contradictory description
of a successful internal-only chatbot response.

---

### Task 4: Running regression verification

**Files:**
- Test: `backend/test-integration.js` (through the existing npm test script)
- Test: focused backend and chatbot tests from Tasks 1–2

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: verified backend/chatbot regression status.

- [ ] **Step 1: Run the full existing backend test command**

Run from `FleetGuard/backend`: `npm test`

Expected: PASS; investigate and report any unrelated baseline failure by name.

- [ ] **Step 2: Run all focused AI tests**

Run the Task 1–2 commands again after regression testing.

Expected: all focused tests PASS.

- [ ] **Step 3: Verify frontend error handling and build**

Run from `FleetGuard/frontend`: `npm run lint` and `npm run build`.

Expected: PASS; both existing chat screens continue to render backend error
messages without requiring a UI contract change.

- [ ] **Step 4: Run a live Gemini smoke test only when locally configured**

If `GEMINI_API_KEY` is already configured locally, make one User and one Admin
request and verify each returns a Gemini model status and the expected
structured data. Never print, request, or commit the key. If no key is
configured, report that mock-SDK and missing-key tests passed and skip the
live-provider smoke test.
