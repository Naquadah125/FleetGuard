# Remove VideoAnalysis Storage Integration

## Intent

Remove the unused video-report persistence feature from the backend so it no
longer exposes or depends on `VideoAnalysis`. Keep the offline
`VideoAnalyzer` implementation and the live driver-camera/telemetry flow.

## Goals and non-goals

- Remove the `VideoAnalysis` model, persistence API, memory fallback, and
  analytics/chatbot consumers and tests.
- Keep camera realtime sessions, telemetry, and the standalone offline
  analyzer intact.
- Do not delete existing MongoDB collections or documents.

## Approaches

- **Remove backend integration (recommended):** Remove the model and all
  backend/API/chatbot references. This avoids leaving broken consumers while
  preserving the separate scanning and realtime-camera features.
- **Remove only the Mongo model:** Keep API and chatbot surfaces. Rejected
  because those surfaces would still depend on unavailable persistence.

## Constraints and verification

Follow existing backend/chatbot patterns. Run focused backend analytics,
integration, and chatbot tests; confirm no runtime references to
`VideoAnalysis` or its API remain outside retained historical documentation.
