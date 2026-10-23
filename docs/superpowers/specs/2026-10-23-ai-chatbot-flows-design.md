# FleetGuard AI Chatbot Flows Design

## Intent

Correct the User and Admin chatbot flows so successful answers genuinely use
the configured Gemini API, analytics come from FleetGuard records, and the
documentation matches runtime behavior.

## Goals

- User questions use Gemini with controlled tools for that user's driving
  sessions, emotion telemetry, and video analyses.
- Admin questions use Gemini to select an allowed analytics intent, backend
  analytics scoped to the Admin's organization to gather data, then Gemini to
  explain the result.
- Combine `DrivingSession`, `EmotionLog`, and `VideoAnalysis` as appropriate
  to the question.
- Missing Gemini configuration and exhausted provider attempts return explicit
  errors, never a successful internal-only answer.
- Preserve existing chat sessions, UI contracts, and configured model failover.
- Add one shared flow guide and reconcile related Markdown documentation.

## Non-goals

- Changing the AI scanning/computer-vision pipeline.
- Allowing an Admin to query users outside their organization.
- Adding tools that mutate user, session, or organization data.
- Training or replacing the emotion-recognition model.
- Redesigning either chat UI.

## Constraints and assumptions

- Existing entry point is authenticated `POST /api/analytics/chatbot`.
- The authenticated identity is authoritative; never trust model-supplied
  `user_id`, `driver_id` for a User, or `organizationId`.
- User analytics are limited to the authenticated User's own records.
- Admin analytics include users belonging to the authenticated Admin's
  organization only.
- MongoDB/internal analytics remain the source of numeric results; Gemini
  selects approved tools and explains returned data, not invents metrics.
- `GEMINI_API_KEY`, `GEMINI_MODEL`, and `GEMINI_MODELS` remain backend-only.
- Existing frontend error presentation is reused for explicit API failures.

## Approaches considered

### A. Extend the existing ChatService and tool layer — selected

Keep the shared chat endpoint and Gemini client. Require Gemini for successful
answers. Use the existing User analytics tools and add a constrained Admin
analytics tool that accepts an allowed intent/period while the backend derives
the organization scope from the authenticated request. Return tool results to
Gemini for the final explanation. This reuses model failover and conversation
handling while keeping data access in the backend.

### B. Add a separate Admin Gemini service

This would isolate Admin behavior, but duplicates provider configuration,
timeouts, model failover, and chat handling. It adds maintenance cost without
changing the required access boundary.

### C. Put analytics data directly in the prompt

This avoids tool integration but makes large queries and organization scoping
harder to control, and encourages the model to reason over unstructured data.
It does not meet the requirement for reliable, source-backed statistics.

## Agreed behavior

### User flow

1. Authenticate the request and load the user's conversation history.
2. Send the message and approved User tools to Gemini.
3. For data questions, execute the selected tool using the authenticated
   User's identity, querying sessions and relevant telemetry/video records.
4. Send tool results back to Gemini and return its explanation plus structured
   data.
5. For general safety questions, return Gemini's direct answer without
   fabricating telemetry.

User statistics cover driving-session count and period, safety score,
drowsiness/yawning/distraction counts, alert levels, and duration. Detailed
emotion and video questions may use the corresponding `EmotionLog` and
`VideoAnalysis` records. An explicit date range or session ID in the question
must be respected; without one, the default period is the last 7 days.

### Admin flow

1. Authenticate the request and load the Admin's conversation history.
2. Send the message and constrained Admin analytics tool to Gemini.
3. Gemini selects an allowed intent and period; backend resolves analytics
   using the authenticated Admin's organization and applicable session,
   emotion, and video records.
4. Send structured results, including a no-data result when applicable, back
   to Gemini for explanation.
5. Return the Gemini explanation with the structured analytics result.

Supported Admin intents remain fleet overview, alerts/violations, emotion
breakdown, and driver-risk ranking. Overview includes driver/session counts,
average safety score, and critical alerts; alerts and rankings use session
alert counts/safety scores; emotion breakdown uses emotion records. A
requested period takes precedence; otherwise query the last 7 days, expanding
to 30 days and then all organization history only if the current window has no
usable records.

### Provider failures

- Missing API configuration returns an explicit service-unavailable response.
- If configured Gemini models fail, return an explicit provider error after
  existing model failover attempts; do not substitute local narrative answers.
- Do not return success-shaped responses for tool/provider failures.
- Keep provider credentials and raw provider details out of client responses.

## Documentation

Add this shared flow design/guide and update the existing chatbot README,
User setup guide, and User/Admin design documents where they conflict with the
agreed runtime behavior. Do not change documentation for AI scanning.

## Verification

- Tests prove User analytics calls Gemini tools and cannot escape the
  authenticated User scope.
- Tests prove Admin intent selection, organization-scoped analytics across
  the agreed data sources, and Gemini interpretation (including no-data).
- Missing key and provider/model failures produce explicit non-success
  responses for both roles.
- Existing session persistence and frontend error handling remain functional.
- Relevant backend/chatbot tests pass. A live API smoke test is run only if a
  Gemini key is already configured locally; test credentials are never
  requested or committed.

## Builder-check calls

- Metric groups and Admin period expansion follow the existing User/Admin
  specifications and the current `DrivingSession`, `EmotionLog`, and
  `VideoAnalysis` schemas.
- User default period is the last 7 days; explicit user-selected date ranges
  and session IDs take precedence.
