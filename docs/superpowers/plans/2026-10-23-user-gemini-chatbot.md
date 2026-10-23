# User Gemini Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real Gemini-powered, session-based safety chatbot to the User/Driver area with emotion statistics and video emotion results.

**Architecture:** Keep Gemini server-side behind the existing Express analytics route. Authenticate with the existing JWT middleware, load the user's chat history, let Gemini call only the existing emotion/video analytics tools, persist messages, and return both natural language and structured data to a new React chat route.

**Tech Stack:** Express, Mongoose, `@google/genai`, React 19, React Router, CSS Modules, existing FleetGuard tokens.

**Spec:** `docs/superpowers/specs/2026-10-23-user-gemini-chatbot-design.md`

## Global Constraints

- The Gemini API key stays on the backend.
- The authenticated JWT user is the source of identity; do not trust client-supplied user IDs.
- Gemini interprets telemetry/video analysis data; it does not replace the emotion-recognition pipeline.
- Missing Gemini configuration and upstream errors must be explicit error states.
- User/Driver is in scope; Admin is out of scope for this iteration.
- Use TDD: every production behavior starts with a failing test.

## Review Focus

- Missing `GEMINI_API_KEY` must return a clear configuration error, not fake success — Task 1 test.
- A driver must not query another driver's data by submitting a different ID — Task 1 test.
- Gemini tool output must survive into `structuredData` for UI rendering — Task 1 test.
- A new session must clear the visible conversation without losing the current user identity — Task 3 test.
- Failed sends and loading state must be visible and recoverable — Task 3 test.

---

### Task 1: Building the authenticated Gemini gateway

**Files:**
- Modify: `backend/src/controllers/analyticsController.js`
- Modify: `backend/src/routes/analyticsRoutes.js`
- Modify: `backend/src/middleware/authMiddleware.js` only if the existing export cannot be reused
- Modify: `ai-chatbot/src/chatService.js`
- Modify: `ai-chatbot/src/systemPrompt.js`
- Test: `backend/test-chatbot.js`

**Interfaces:**
- Consumes: existing `query_emotion_stats` and `get_video_emotion_breakdown` tool declarations/execution.
- Produces: `POST /api/analytics/chatbot` accepting `{ session_id, message }` with bearer JWT and returning `{ success, session_id, reply, structuredData, toolsUsed, model, timestamp }`.

- [ ] **Step 1: Write the failing backend tests**

Add tests for:

```js
test('rejects chatbot requests without authentication', async () => {
  const response = await httpRequest('/api/analytics/chatbot', 'POST', {
    session_id: 'chat_test',
    message: 'Thống kê cảm xúc'
  })
  assert(response.status === 401)
})

test('returns an explicit configuration error without Gemini credentials', async () => {
  const response = await httpRequest('/api/analytics/chatbot', 'POST', {
    session_id: 'chat_test',
    message: 'Thống kê cảm xúc'
  }, driverToken)
  assert(response.status === 503)
  assert(response.data.success === false)
})

test('returns Gemini reply and tool data with the authenticated user scope', async () => {
  // Inject a deterministic Gemini gateway seam for the test.
  // Assert the response contains reply, toolsUsed and structuredData.
})
```

- [ ] **Step 2: Run `node test-chatbot.js` and verify the tests fail for the missing route/auth/Gemini behavior**

- [ ] **Step 3: Implement the minimal gateway**

Use `requireAuth`, construct the service with the configured `GEMINI_API_KEY`,
pass authenticated user identity into the service, and return explicit `503` for
missing configuration/upstream failures. Preserve tool results as structured
data. Restrict analytics arguments to the authenticated user where applicable.

- [ ] **Step 4: Run `node test-chatbot.js` and verify all chatbot assertions pass**

- [ ] **Step 5: Run `npm test` in `backend` and verify the existing integration suite still passes**

### Task 2: Persisting chat sessions and messages

**Files:**
- Modify: `backend/src/models/ChatConversation.js`
- Modify: `backend/src/controllers/analyticsController.js`
- Modify: `backend/src/db.js` only if memory fallback needs a session collection
- Test: `backend/test-chatbot.js`

**Interfaces:**
- Consumes: authenticated gateway from Task 1.
- Produces: persisted records keyed by `user_id` and `session_id`, plus `GET /api/analytics/chatbot/sessions/:session_id` for loading a session.

- [ ] **Step 1: Add a failing test for saving/loading two messages in one session**

- [ ] **Step 2: Run the focused test and verify it fails because session persistence is absent**

- [ ] **Step 3: Add `session_id` to the model, save user/model messages, and implement the authenticated session-history endpoint**

- [ ] **Step 4: Run the focused test and verify it passes**

- [ ] **Step 5: Run `npm test` in `backend`**

### Task 3: Building the User chat surface

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/driver/DriverLayout.jsx`
- Modify: `frontend/src/pages/driver/DriverLayout.module.css`
- Create: `frontend/src/pages/driver/DriverChat.jsx`
- Create: `frontend/src/pages/driver/DriverChat.module.css`
- Test: `frontend/test/chat-ui.test.js` or the repository's existing UI test location

**Interfaces:**
- Consumes: Task 1/2 API contract and `useAuth`.
- Produces: `/driver/chat`, active sidebar link, new-session action, send/loading/error states, starter prompts, and structured emotion table.

- [ ] **Step 1: Write failing UI behavior tests**

Cover route rendering, `Tạo session mới`, send payload, loading state,
explicit error state, and rendering `emotion_distribution`.

- [ ] **Step 2: Run the focused UI test and verify it fails because the route and component do not exist**

- [ ] **Step 3: Implement the route, chat component, API calls, and responsive CSS using existing dashboard tokens**

- [ ] **Step 4: Run the focused UI test and verify it passes**

- [ ] **Step 5: Run `npm run lint` and `npm run build` in `frontend`**

### Task 4: Documenting real Gemini setup and final verification

**Files:**
- Modify: `backend/README.md`
- Modify: `FleetGuard/README.md`
- Create: `docs/superpowers/guide/user-gemini-chatbot.md`

**Interfaces:**
- Consumes: final API/UI behavior from Tasks 1–3.
- Produces: setup guide, teacher-facing explanation of model response/tool calling/inference boundary, and runnable verification commands.

- [ ] **Step 1: Write the guide with exact `.env` variables, request/response example, and model explanation**

- [ ] **Step 2: Run the final backend and frontend test/build commands**

- [ ] **Step 3: Run HTTP smoke tests for `/api/health`, `/api/analytics/chatbot`, and `/driver/chat`**

