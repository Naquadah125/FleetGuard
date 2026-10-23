# User Gemini Chatbot Design

## Intent

Add a real Gemini-powered assistant to the User/Driver area so a driver can ask
about safety and emotion telemetry, request emotion statistics for a time range,
and inspect emotion results from an analyzed video. The first release is a
simple chat surface with a visible "new session" action.

The feature must also support the end-of-term demonstration questions:

- how the model returns data;
- which model is used and why;
- how inference/tool calling interacts with FleetGuard data.

## Goals

- Replace the disabled User navigation item with a working `/driver/chat` route.
- Send chat requests through the backend to the real Gemini API.
- Let Gemini call controlled backend tools for emotion statistics and video
  emotion breakdowns.
- Return both a natural-language answer and optional structured data for the UI.
- Persist chat messages by user/session in MongoDB when available.
- Keep the Gemini API key on the backend only.
- Provide clear setup guidance through environment variables and a short
  implementation note.

## Non-goals

- Do not add the chatbot to the Admin area in this iteration.
- Do not implement video upload or a new emotion-recognition model here.
- Do not expose the Gemini API key to the frontend.
- Do not invent emotion data when the requested telemetry/video does not exist.
- Do not claim that Gemini itself performs face/video emotion recognition; the
  existing telemetry/video analysis pipeline supplies the data and Gemini
  interprets it.

## Constraints and assumptions

- Existing stack: React/Vite frontend and Express/Mongoose backend.
- Existing analytics endpoints are the source of truth for emotion data.
- Existing Gemini integration under `FleetGuard/ai-chatbot/` is the starting point,
  but its current role check is for `FLEET_ADMIN`; User access must be changed to
  the application's authenticated `DRIVER`/`USER` roles with data scoped to that
  user.
- The frontend already stores the JWT as `fleet_token`.
- `GEMINI_API_KEY` and optional `GEMINI_MODEL` are backend environment variables.
- The default model remains `gemini-2.5-flash` unless configuration overrides it.
- When Gemini is unavailable or returns an error, the API must return an explicit
  error state rather than silently presenting a successful fake answer.

## Approaches considered

### A. Frontend calls Gemini directly

Rejected. It would expose the API key, bypass access control, and prevent safe
tool calls against FleetGuard data.

### B. Backend Gemini gateway with function calling — chosen

The frontend sends `{ session_id, message }` to the backend. The backend
authenticates the user, loads the session history, calls Gemini with controlled
function declarations, executes only the allowed analytics tools, sends tool
results back to Gemini, and returns `{ reply, structuredData, toolsUsed }`.

This preserves the existing architecture, makes the model/data boundary
explainable in the final presentation, and supports both real Gemini responses
and structured emotion tables.

### C. Rule-based local chatbot

Useful as an offline prototype but insufficient for the requirement to use the
real Gemini API and for demonstrating model inference/tool calling. It may only
remain as an explicit configuration-free error explanation, not as a success
fallback.

## Data contract

### Request

`POST /api/analytics/chatbot`

```json
{
  "session_id": "chat_1729680000000",
  "message": "Thống kê cảm xúc giận dữ từ 1/10 đến 7/10"
}
```

The authenticated user comes from the bearer JWT, not from client-supplied
`user_id` or `user_email`.

### Response

```json
{
  "success": true,
  "session_id": "chat_1729680000000",
  "reply": "...",
  "structuredData": {
    "type": "emotion_stats",
    "source": "query_emotion_stats",
    "data": {}
  },
  "toolsUsed": ["query_emotion_stats"],
  "model": "gemini-2.5-flash",
  "timestamp": "2026-10-23T..."
}
```

Errors use a non-2xx response with `{ "success": false, "message": "..." }`.

## UI proposal

The User sidebar item becomes a `NavLink` labeled `Trợ lý AI`. The chat screen
uses the existing dashboard shell and tokens:

- header: title, short explanation of live Gemini/data-tool behavior, and
  `Tạo session mới`;
- conversation area: user/model message rows, loading state, explicit error
  state, and starter prompts;
- structured result area: a compact emotion distribution table when the
  response contains analytics data;
- composer: labeled textarea/input and send button with keyboard submit.

The first session is created client-side with a stable ID and persisted in
local storage only for the active user. MongoDB persists the actual messages.

## Security and teaching points

- Validate JWT with the existing `requireAuth` middleware.
- Scope analytics queries to the authenticated driver where the data model
  supports it.
- Keep API keys and Gemini calls server-side.
- Tool declarations whitelist only `query_emotion_stats` and
  `get_video_emotion_breakdown`.
- The guide will explain: prompt → Gemini function call → backend tool →
  structured JSON → Gemini summary → UI rendering.

## Verification

- Backend tests cover rejected unauthenticated requests, successful Gemini
  response shape, tool-call structured data, and explicit missing-key errors.
- Frontend checks cover the route, new-session reset, send/loading/error states,
  and rendering of structured emotion data.
- Run backend tests, frontend lint, frontend build, and an HTTP smoke test with
  a configured Gemini key.
