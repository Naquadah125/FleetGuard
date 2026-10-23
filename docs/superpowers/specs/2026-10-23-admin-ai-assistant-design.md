# Admin AI Assistant Design

## Intent

Provide a Gemini-backed Admin assistant for questions about fleet overview,
alerts, emotion signals, and driver risk. It operates only on users in the
authenticated Admin's organization.

## Goals

- Use Gemini to select an allowed analytics intent and explain its result.
- Use backend analytics as the source of numeric data.
- Query the authenticated Admin's organization only.
- Preserve structured data for UI rendering and CSV/JSON export.
- Return an explicit error when Gemini or a required tool cannot complete.

## Non-goals

- Reading or mixing data from other organizations.
- Mutating users, sessions, scores, alerts, or organization data.
- Using frontend demo/localStorage data as analytics input.
- Treating predicted emotion as psychological certainty.
- Replacing or training the computer-vision model.

## Architecture and data flow

The authenticated `POST /api/analytics/chatbot` route loads the Admin's chat
history and passes the message to the shared `ChatService`. Gemini receives
only the `resolve_admin_analytics` function tool. It chooses an allowed intent
(`overview`, `alerts`, `emotions`, or `ranking`) and optional requested period.
The backend—not Gemini—supplies the authenticated Admin's organization to
`resolveAdminAnalytics`. Structured analytics, including a structured no-data
result, are sent back to Gemini for the final explanation.

Analytics use only records belonging to drivers/users in that organization:

- `DrivingSession`: trip counts, safety scores, duration, alert levels, and
  drowsy/yawn/distraction counts.
- `EmotionLog`: emotion and attention telemetry.
- `VideoAnalysis`: organization-scoped analyzed-video records and record
  counts.

The current Admin response types are `fleet_overview`,
`driver_alert_ranking`, `emotion_breakdown`, `alert_breakdown`, and
`no_data_guidance`. Each includes a period, source, record counts, and the
metrics or rows appropriate to its type.

## Period selection

- A period requested in the question or selected by Gemini is queried first.
- If it has no usable records, the backend expands to 30 days and then all
  history for that organization.
- Without an explicit period, the initial period is the latest 7 days.
- The returned period identifies which window supplied the result.

## Gemini configuration and failures

Configure `GEMINI_API_KEY` in the backend environment. `GEMINI_MODEL` chooses
the default model; optional `GEMINI_MODELS` supplies an ordered failover list,
and `GEMINI_TIMEOUT_MS` sets the timeout. Keep credentials backend-only.

Successful chatbot answers require Gemini. Missing key returns HTTP 503 with
`GEMINI_NOT_CONFIGURED`. If configured models are exhausted or a required
tool/Gemini response fails, the API returns a safe non-2xx error. It never
returns an internal-only narrative as a successful Gemini answer. Internal
analytics are used as the numeric source only after Gemini has selected the
tool.

## Access control and UI

- The JWT supplies the Admin identity and organization.
- Tool arguments cannot set `organizationId`, driver IDs, or user IDs.
- Results are rendered from structured data, never model-generated HTML.
- The UI may display model/tool/source metadata and export the structured
  response.
- Emotion confidence is a model signal, not a psychological conclusion.

## Approaches considered

### A. Extend the existing shared ChatService and tool layer — selected

Reuses Gemini configuration, failover, chat history, and response handling
while the server-side Admin resolver enforces organization scope.

### B. Create a separate Admin Gemini service

Would isolate the role but duplicate provider configuration, failover, timeout,
and chat handling without improving the organization boundary.

### C. Internal analytics only

Would provide deterministic numbers but remove the Gemini intent-selection
and explanation flow required by this assistant.

## Verification

- User-supplied/model-supplied IDs cannot escape the Admin's organization.
- Analytics include organization-scoped sessions, emotion logs, and video
  records; no demo data is substituted.
- Admin intent selection and structured no-data results pass through Gemini
  for explanation.
- Missing key and provider/tool failures return non-success API responses.
- Configured model failover tries models in order without repeating a model in
  the same request.
