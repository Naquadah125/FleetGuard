# Remove VideoAnalysis Storage Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove backend persistence and consumers for offline video-analysis reports without changing the offline analyzer or realtime camera flow.

**Architecture:** Remove the `VideoAnalysis` Mongoose model, REST endpoints, and memory fallback, along with admin analytics and chatbot consumers. Keep the standalone `VideoAnalyzer` and camera telemetry/session routes unchanged; do not delete existing MongoDB data.

**Tech Stack:** Node.js ES modules, Express, Mongoose, existing Node test scripts.

**Spec:** `docs/superpowers/specs/2026-10-24-remove-video-analysis-storage-design.md`

## Global Constraints

- Keep the offline `VideoAnalyzer` implementation and the live driver-camera/telemetry flow.
- Do not delete existing MongoDB collections or documents.
- Remove the model, persistence API, memory fallback, and analytics/chatbot consumers and tests.

## Review Focus

- Removed GET and POST report endpoints must return 404; test both in `backend/test-integration.js`.
- Admin analytics must work without video records or a `VideoAnalysis` model; test in `backend/test-admin-analytics.js`.
- Chatbot declarations and execution must no longer expose the video-report lookup; test in `ai-chatbot/test/test-chatbot.js`.
- Realtime session/telemetry behavior remains available; retain the existing integration assertions in `backend/test-integration.js`.
- Historical MongoDB documents are not deleted; implementation contains no collection-drop or delete operation.

---

### Task 1: Remove backend video-report persistence and analytics

**Files:**
- Modify: `FleetGuard/backend/src/db.js`
- Modify: `FleetGuard/backend/src/models/index.js`
- Delete: `FleetGuard/backend/src/models/VideoAnalysis.js`
- Modify: `FleetGuard/backend/src/controllers/analyticsController.js`
- Modify: `FleetGuard/backend/src/routes/analyticsRoutes.js`
- Modify: `FleetGuard/backend/src/services/adminAnalyticsService.js`
- Modify: `FleetGuard/backend/src/seedBlank.js`
- Modify: `FleetGuard/backend/test-integration.js`
- Modify: `FleetGuard/backend/test-admin-analytics.js`
- Create: `FleetGuard/backend/test-video-analysis-removed.js`

**Interfaces:**
- Remove `getVideoAnalysis` and `saveVideoAnalysis`, and the `/videos/:id` and `/videos` routes.
- Remove `VideoAnalysis` and `memoryStore.videoAnalyses`; leave other model exports and stores unchanged.
- Admin analytics derives results from users, sessions, and emotion logs only.

- [ ] **Step 1: Replace video-persistence integration assertions**

In `backend/test-integration.js`, replace the video report save/read test with assertions that `POST /api/analytics/videos` and `GET /api/analytics/videos/:id` both return 404. Keep other integration tests intact.

- [ ] **Step 2: Run the integration test to verify the regression**

Run: `node test-video-analysis-removed.js` from `FleetGuard/backend`

Expected: FAIL because the video endpoints currently still exist.

- [ ] **Step 3: Remove backend model and route/controller references**

Remove the model import/export, schema file, video handlers and their exports, both routes, and the `videoAnalyses` memory store. Remove the seed reset operation for this model; do not drop or delete any MongoDB collection.

- [ ] **Step 4: Remove video records from admin analytics**

In `adminAnalyticsService.js`, remove model and memory reads, video filtering, and video counts; preserve analytics behavior based on sessions and emotion logs. Update `backend/test-admin-analytics.js` fixtures and assertions to verify those remaining sources still produce expected results without a video model.

- [ ] **Step 5: Run backend focused tests**

Run: `node test-video-analysis-removed.js` and `node test-admin-analytics.js` from `FleetGuard/backend`.

Expected: focused tests pass; the HTTP test confirms both report endpoints return 404, and admin analytics works without a video model. The broader `npm test` currently stalls before reaching the video assertions because its Socket.IO clients omit the token required by the server; the integration file retains endpoint-404 assertions for when that existing fixture is corrected.

### Task 2: Remove chatbot video-report lookup and update active documentation

**Files:**
- Modify: `FleetGuard/ai-chatbot/src/tools.js`
- Modify: `FleetGuard/ai-chatbot/src/systemPrompt.js`
- Modify: `FleetGuard/ai-chatbot/test/test-chatbot.js`
- Modify: `FleetGuard/ai-chatbot/README.md`
- Modify: `FleetGuard/docs/superpowers/guide/ai-chatbot-flows.md`
- Modify: `FleetGuard/docs/superpowers/guide/user-gemini-chatbot.md`

**Interfaces:**
- Remove the `get_video_emotion_breakdown` tool declaration and execution path.
- Keep other chatbot tools and their authorization behavior unchanged.
- Update active guides to describe supported sources without video-report lookup; retain dated specs/plans as historical records.

- [ ] **Step 1: Update chatbot regression tests**

In `ai-chatbot/test/test-chatbot.js`, remove expectations and execution checks for `get_video_emotion_breakdown`; add an assertion that the tool is not declared. Keep other tool assertions.

- [ ] **Step 2: Run the chatbot test to verify the regression**

Run: `node test/test-chatbot.js` from `FleetGuard/ai-chatbot`

Expected: FAIL because the video tool remains declared and executable.

- [ ] **Step 3: Remove the chatbot video lookup**

Remove its declaration and HTTP execution in `tools.js`, and remove its instruction from `systemPrompt.js`. Keep all other tool definitions unchanged.

- [ ] **Step 4: Update active documentation**

Remove claims of supported video-report lookup from the chatbot README and active guides. Leave dated design/spec/plan documents unchanged as historical records.

- [ ] **Step 5: Run chatbot tests and check for stale runtime references**

Run: `node test/test-chatbot.js` from `FleetGuard/ai-chatbot`; then search runtime sources for `VideoAnalysis`, `videoAnalyses`, `get_video_emotion_breakdown`, and `/api/analytics/videos`.

Expected: chatbot test passes; no matches remain in runtime sources, while standalone `ai-scanning/src/videoAnalyzer.js` is unchanged.
