# Admin AI Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an organization-scoped Admin AI assistant that returns structured fleet analytics, uses configurable Gemini model failover, and falls back transparently to deterministic internal analytics.

**Architecture:** Extend the existing `/api/analytics/chatbot` flow rather than creating a second chatbot stack. A backend analytics service owns organization-scoped MongoDB queries and period expansion; `ChatService` owns Gemini interpretation and ordered model attempts; the Admin page renders the fixed response schema instead of model-generated HTML.

**Tech Stack:** Express, Mongoose, Node ESM, `@google/genai`, React, React Router, CSS Modules, existing Node integration scripts.

**Spec:** `docs/superpowers/specs/2026-10-23-admin-ai-assistant-design.md`

## Global Constraints

- Analytics source of truth is MongoDB backend data, never frontend demo localStorage.
- Every Admin query is scoped to the authenticated user's `organizationId`.
- Default period is 7 days; empty results expand to 30 days, then all organization history.
- Supported emotion labels are `neutral`, `happy`, `angry`, `sad`, `surprised`, and `fatigued`.
- Gemini model names come from `GEMINI_MODELS`; `GEMINI_MODEL` remains the fallback single-model setting.
- Each configured model is attempted at most once per request; no retry loop.
- Provider errors, API keys, JWTs, passwords, and stack traces are never returned to the browser.
- AI cannot mutate users, sessions, scores, thresholds, or organization data.
- UI copy is Vietnamese and emotion results are presented as predictions, not psychological conclusions.

## Review Focus

- Missing or malformed `organizationId`: return no cross-organization data and a useful no-data state; test in Task 1.
- A driver/session with no matching organization user: exclude it from every aggregate; test in Task 1.
- Empty 7-day and 30-day windows: expand deterministically and report the actual period; test in Task 1.
- Primary Gemini failure followed by fallback success: call each model once and report the selected model; test in Task 2.
- All Gemini models unavailable or quota-exhausted: return internal analytics with a visible provider status and no raw error; test in Task 2 and Task 3.

---

### Task 1: Organization-Scoped Admin Analytics Service

**Files:**
- Create: `FleetGuard/backend/src/services/adminAnalyticsService.js`
- Modify: `FleetGuard/backend/src/controllers/analyticsController.js`
- Modify: `FleetGuard/backend/src/models/User.js` only if the existing organization fields need a query index
- Test: `FleetGuard/backend/test-integration.js`

**Interfaces:**
- Consumes: authenticated user `{ id, role, organizationId }`; `User`, `DrivingSession`, `EmotionLog`, and `VideoAnalysis` models.
- Produces: `resolveAdminAnalytics({ organizationId, intent, startDate, endDate, driverId }) -> Promise<AdminAnalyticsResult>` with `type`, `title`, `period`, `source`, `recordsUsed`, and intent-specific structured data.

- [ ] **Step 1: Add failing integration assertions** for a company Admin that has one same-organization driver and one different-organization driver. Assert the response excludes the other organization and returns `source: "internal"`.
- [ ] **Step 2: Add failing assertions** for 7-day empty data expanding to 30 days, then all history, and for an organization with no records returning `type: "no_data_guidance"` without demo names or fabricated counts.
- [ ] **Step 3: Implement `resolveAdminAnalytics`** in `adminAnalyticsService.js`. Resolve the authenticated organization first, build the candidate windows `[7 days, 30 days, all history]`, load only users with the matching `organizationId`, and constrain sessions/emotion logs/video analyses through those user/session IDs.
- [ ] **Step 4: Implement fixed result builders** for `fleet_overview`, `driver_alert_ranking`, `emotion_breakdown`, `alert_breakdown`, and `no_data_guidance`. Include `driverId` in ranking rows, six emotion labels, `recordsUsed`, and the actual selected period.
- [ ] **Step 5: Wire the service into the Admin chatbot path** without changing the existing driver-scoped behavior. Reject non-Admin use of Admin intents with the existing auth convention.
- [ ] **Step 6: Run the focused backend integration test**.

Run: `node FleetGuard/backend/test-integration.js`

Expected: all existing assertions plus organization isolation, period fallback, and no-demo-data assertions pass.

---

### Task 2: Configurable Gemini Model Failover

**Files:**
- Modify: `FleetGuard/ai-chatbot/src/geminiClient.js`
- Modify: `FleetGuard/ai-chatbot/src/chatService.js`
- Modify: `FleetGuard/ai-chatbot/test/test-chatbot.js`
- Modify: `FleetGuard/backend/src/controllers/analyticsController.js` if response metadata needs to be forwarded
- Modify: `FleetGuard/backend/.env.example` if present; otherwise document the variables without copying secrets

**Interfaces:**
- Consumes: `GEMINI_MODELS` comma-separated configuration, then `GEMINI_MODEL`, then the existing default.
- Produces: `ChatService.sendMessage(...) -> { reply, structuredData, toolsUsed, modelStatus }`, where `modelStatus` contains only `{ source, attemptedModels, selectedModel, failureCode? }`.

- [ ] **Step 1: Add failing chatbot tests** with three fake Gemini clients: primary failure/fallback success, all models failing, and a hanging model. Assert each model is called once, no raw provider error is returned, and fallback status is explicit.
- [ ] **Step 2: Implement model-list parsing** in `geminiClient.js` with trimming, empty-value removal, stable order, and backward compatibility with `GEMINI_MODEL`.
- [ ] **Step 3: Refactor the Gemini call boundary** in `ChatService` so each configured model gets one bounded attempt for the full tool/final-response loop. Classify unavailable/429/503/timeout as retryable and retain the existing thought-signature handling.
- [ ] **Step 4: Return sanitized status metadata** when a model succeeds or all models fail. On total failure, call the existing local fallback and set the Vietnamese quota/unavailable status without exposing provider details.
- [ ] **Step 5: Run the chatbot test script**.

Run: `node FleetGuard/ai-chatbot/test/test-chatbot.js`

Expected: existing RBAC/tool/thought-signature/timeout assertions and all failover assertions pass.

---

### Task 3: Admin Chatbot API Contract

**Files:**
- Modify: `FleetGuard/ai-chatbot/src/tools.js`
- Modify: `FleetGuard/ai-chatbot/src/systemPrompt.js`
- Modify: `FleetGuard/backend/src/controllers/analyticsController.js`
- Modify: `FleetGuard/backend/src/routes/analyticsRoutes.js` only if a separate explicit Admin route is needed
- Test: `FleetGuard/backend/test-integration.js`

**Interfaces:**
- Consumes: `POST /api/analytics/chatbot` body `{ message, session_id }` and JWT organization identity.
- Produces: JSON `{ success, session_id, reply, structuredData, toolsUsed, modelStatus, timestamp }`.

- [ ] **Step 1: Add failing API assertions** for overview, alerts, and emotion prompts, requiring fixed `structuredData.type`, `period`, `source`, `recordsUsed`, and `modelStatus`.
- [ ] **Step 2: Extend tool declarations/context** so Admin tool calls cannot provide an arbitrary organization ID or bypass the authenticated organization. The backend service, not Gemini, chooses the organization filter.
- [ ] **Step 3: Update the system prompt** to require Vietnamese explanation, structured result use, confidence/disclaimer language, no mutations, and no HTML generation.
- [ ] **Step 4: Update `chatWithSafetyAdvisor`** to pass organization context, preserve chat history, save structured data, and forward sanitized model status.
- [ ] **Step 5: Add explicit retry semantics**: a client retry starts a new provider attempt but does not duplicate or mutate analytics records.
- [ ] **Step 6: Run the backend integration test**.

Run: `node FleetGuard/backend/test-integration.js`

Expected: Admin API contract assertions pass and existing auth/session/telemetry tests remain green.

---

### Task 4: Admin AI Page and Navigation

**Files:**
- Create: `FleetGuard/frontend/src/pages/admin/AdminChat.jsx`
- Create: `FleetGuard/frontend/src/pages/admin/AdminChat.module.css`
- Modify: `FleetGuard/frontend/src/App.jsx`
- Modify: `FleetGuard/frontend/src/pages/admin/AdminLayout.jsx`
- Modify: `FleetGuard/frontend/src/pages/admin/AdminPages.module.css` only for shared layout tokens if necessary

**Interfaces:**
- Consumes: `useAuth()` token/user, the Admin chatbot API response contract from Task 3.
- Produces: `/admin/chat` route, active “Trợ lý AI” navigation item, structured cards/tables, retry action, explanation panel, and JSON/CSV export for the latest structured result.

- [ ] **Step 1: Add the route and enabled nav item** while keeping the existing Admin-only route guard.
- [ ] **Step 2: Build the chat state flow** based on `DriverChat`: load/create sessions, send messages with bearer auth, render loading/error/empty states, and keep the existing new-session behavior.
- [ ] **Step 3: Render each fixed result type** with readable Vietnamese labels, period/source/records-used metadata, driver profile links under `/admin/employees`, and the emotion prediction disclaimer.
- [ ] **Step 4: Add the sanitized “Xem cách phân tích” panel** showing intent, tools, attempted/selected model, source, and fallback status; never render raw backend errors.
- [ ] **Step 5: Add retry and JSON/CSV export** using the current structured result only, with disabled/loading states and accessible labels.
- [ ] **Step 6: Run frontend lint and production build**.

Run: `npm --prefix FleetGuard/frontend run lint`

Expected: lint passes with no new errors.

Run: `npm --prefix FleetGuard/frontend run build`

Expected: production build completes successfully.

---

### Task 5: End-to-End Verification and Documentation

**Files:**
- Modify: `FleetGuard/README.md` or the existing setup documentation
- Modify: `FleetGuard/backend/.env.example` if available
- Test: `FleetGuard/ai-chatbot/test/test-chatbot.js`
- Test: `FleetGuard/backend/test-integration.js`

**Interfaces:**
- Consumes: completed backend, chatbot, and frontend tasks.
- Produces: documented local setup and a repeatable verification record without secrets.

- [ ] **Step 1: Document `GEMINI_MODELS` configuration**, fallback behavior, quota limitations, and the fact that multiple models may still share one Google project quota.
- [ ] **Step 2: Run the chatbot and backend scripts** from clean processes with no API key printed.
- [ ] **Step 3: Run frontend lint/build and inspect the diff** for accidental demo-data use, raw error exposure, or unrelated formatting.
- [ ] **Step 4: Manually verify**: Admin login → `/admin/chat` → overview prompt → emotion prompt → empty-data state → retry after provider failure → profile link, and confirm a different organization never appears.
- [ ] **Step 5: Run `git diff --check`** and record any pre-existing warnings separately from new issues.

Run: `git diff --check`

Expected: no new whitespace errors.
