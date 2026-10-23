# Button Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure action buttons across admin and driver screens give clear feedback without redundant toasts.

**Architecture:** Keep feedback in the existing page handlers so success is only announced after success and existing inline/state feedback remains authoritative. Reuse the shared toast event bus for ambiguous outcomes.

**Tech Stack:** React, JavaScript, existing toast event bus, frontend standalone regression scripts, npm lint/build.

**Spec:** `docs/superpowers/specs/2026-10-24-button-feedback-design.md`

## Global Constraints

- Ensure every action has a visible response through changed UI state, inline status, loading, or a toast.
- Add success toasts only when the outcome is otherwise difficult to notice.
- Report success only after the operation succeeds; preserve or add clear error feedback when it fails.
- Reuse the existing toast system and page-level interaction patterns.
- Do not add toasts to navigation, tabs, or controls whose changed state already makes the result clear.
- Do not show a toast for every click or add loading spinners to instant actions.
- Do not redesign button styling or change unrelated page behavior.

## Review Focus

- A failed request must not produce a success toast; check the relevant action's rejection/error path.
- A refresh/filter that visibly updates its table should not also produce a redundant success toast.
- An instant local toggle must show its changed state without introducing a spinner.
- An export or other side effect with no persistent on-screen result needs one success confirmation.
- Both layouts already mount the toast container; verify any toast remains visible on the page that triggered it.

---

### Task 1: Complete shared error-toast convention

**Files:**
- Modify: `frontend/src/components/common/Toast.jsx`
- Create: `frontend/test-toast-feedback.mjs`

**Interfaces:**
- Consumes: Existing `toast` event bus and `ToastContainer`.
- Produces: `toast.error(message)` consistent with the existing `toast.success(message)` pattern and consumed by current admin error paths.

- [ ] **Step 1: Create `test-toast-feedback.mjs`** with source-contract assertions that `toast.error` emits an error-typed item and the container renders an error-specific presentation.
- [ ] **Step 2: Run `node test-toast-feedback.mjs`** from `frontend/`; verify the missing-helper assertion fails before implementation.
- [ ] **Step 3: Implement `toast.error(title, desc)`** via the existing event bus and add an error-specific container icon/style mapping; leave existing info and success behavior unchanged.
- [ ] **Step 4: Run `node test-toast-feedback.mjs`** from `frontend/`; confirm both error helper and error presentation assertions pass.

### Task 2: Add only missing admin action feedback

**Files:**
- Review route inventory: `frontend/src/App.jsx`
- Review/modify: `frontend/src/pages/admin/AdminChat.jsx`
- Review/modify: `frontend/src/pages/admin/AdminTrips.jsx`
- Review/modify: `frontend/src/pages/admin/AdminAuditLog.jsx`
- Review/modify: `frontend/src/pages/admin/AdminReports.jsx`
- Review/modify: Other admin page modules registered in `frontend/src/App.jsx`, including existing CRUD and profile actions
- Create: `frontend/test-admin-action-feedback.mjs`
- Regression checks: `frontend/test-admin-trips.mjs`, `frontend/test-admin-audit-log.mjs`

**Interfaces:**
- Consumes: Existing page handlers, inline error/loading states, and shared `toast` helpers.
- Produces: Clear feedback for admin actions that otherwise have no visible outcome.

- [ ] **Step 1: Create `test-admin-action-feedback.mjs`** with source-contract assertions that both chat export paths notify success after initiating their download.
- [ ] **Step 2: Run `node test-admin-action-feedback.mjs`** from `frontend/`; verify the missing export-feedback assertion fails before implementation.
- [ ] **Step 3: Review the admin route inventory** and add success feedback after JSON/CSV downloads in `AdminChat.jsx`, with an error toast if a synchronous download operation throws; retain all existing inline/loading/state feedback and do not add redundant toasts to other actions.
- [ ] **Step 4: Run `node test-admin-action-feedback.mjs`, `node test-admin-trips.mjs`, and `node test-admin-audit-log.mjs`** from `frontend/`; confirm all pass.

### Task 3: Verify driver action feedback coverage

**Files:**
- Review route inventory: `frontend/src/App.jsx`
- Review: `frontend/src/pages/driver/DriverCamera.jsx`
- Review: `frontend/src/pages/driver/DriverHistory.jsx`
- Review: `frontend/src/pages/driver/DriverChat.jsx`
- Review: Other driver page modules registered in `frontend/src/App.jsx`, including overview and profile actions
- Regression check: `frontend/test-driver-responsive.mjs`

**Interfaces:**
- Consumes: Existing camera status/error state, chat replies/errors, and history filter/detail state.
- Produces: Driver actions retain a visible response; add feedback only where the operation's result is otherwise unclear.

- [ ] **Step 1: Check every driver action in the route inventory**, using camera state/status, chat reply/error, history filter/detail, and overview/profile state as relevant; include failed asynchronous operations.
- [ ] **Step 2: Add a targeted handler change only for a demonstrated feedback gap**, without adding toasts to state changes that are already apparent.
- [ ] **Step 3: Run `node test-driver-responsive.mjs`** from `frontend/`; confirm it passes.

### Final verification

- [ ] Run `npm run lint`, `npm run check`, and `npm run build` from `frontend/`.
- [ ] Manually verify one success and one failure path on admin and driver screens; ensure no duplicate toast appears when the UI already makes the result clear.
