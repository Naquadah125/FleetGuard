# FleetGuard AI Chatbots

This package contains the shared Gemini gateway used by the User/Driver and
Admin chat experiences. The gateway uses role-specific function tools; backend
analytics remain the source of numeric data.

## Roles and tools

- **User / Driver:** `get_user_safety_summary` reads the authenticated user's
  `DrivingSession` records; `query_emotion_stats` provides scoped emotion detail.
- **Admin:** `resolve_admin_analytics` accepts only an analytics intent and
  optional period. The backend derives the authenticated Admin's organization
  and queries only its users' session and emotion records.

User summaries and emotion statistics default to the latest 7 days. Admin
analytics default to 7 days, expanding to 30 days and then all organization
history when the current range has no usable records.

## Gemini configuration

Create `backend/.env`:

```env
GEMINI_API_KEY=your_real_key
GEMINI_MODEL=gemini-3.6-flash
# Optional:
GEMINI_MODELS=gemini-3.6-flash,another-supported-model
GEMINI_TIMEOUT_MS=8000
```

Never expose the API key in frontend code or commit `.env`. If the key is
missing, the chatbot returns an explicit HTTP 503 error. If all configured
models or a required data tool fail, it returns a safe error response instead
of a successful local fallback answer.

The gateway uses the `@google/genai` Interactions API on `v1beta`. The
currently tested default is `gemini-3.6-flash`; configured models are tried
first, with the current default appended as a fallback for retired model IDs.

## Run tests

```powershell
cd ai-chatbot
node test\test-chatbot.js
node test\test-model-failover.js
```

For the complete flow, test and run the backend from `backend/`. See
[`../docs/superpowers/guide/ai-chatbot-flows.md`](../docs/superpowers/guide/ai-chatbot-flows.md)
for the User/Admin sequence, data boundaries, and response contract.
