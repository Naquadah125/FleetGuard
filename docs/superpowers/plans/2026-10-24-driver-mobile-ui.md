# Driver Mobile UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every User/driver route usable at phone and tablet widths while preserving the current desktop layout.

**Architecture:** Keep the existing fixed sidebar for desktop. At widths up to 900px, use a compact top bar and an accessible off-canvas drawer for navigation and account actions; tune the existing driver page styles only where they still overflow or become unusable.

**Tech Stack:** React, React Router, CSS Modules, Node.js assertion script, integrated Playwright browser.

**Spec:** `docs/superpowers/specs/2026-10-24-driver-mobile-ui-design.md`

## Global Constraints

- Apply the mobile shell only to Driver routes; retain the existing desktop sidebar.
- At phone widths, use a top bar with the current screen title and a menu control. The drawer contains driver destinations and account actions.
- The drawer closes after navigation, on outside interaction, and with Escape; expose its open state accessibly.
- Check driver overview, camera, history, chat, and profile at 390px and 768px; ensure the page itself does not scroll horizontally.
- Check the desktop layout at 1440px to confirm the existing sidebar remains intact.

## Review Focus

- Long page titles must remain readable beside menu/account controls at 390px; cover in the shell browser check.
- Opening the drawer must not leave an invisible overlay or trap content after route selection; cover open, navigate, outside-click, and Escape browser checks.
- Drawer links and account actions must remain reachable by keyboard and touch; cover focus/activation checks and minimum 44px targets.
- The camera screen must keep its view and controls within the viewport at 390px and 768px; cover in camera browser checks.
- Profile form and preview must remain legible and not introduce page-level overflow; cover at both widths.

---

### Task 1: Add driver mobile layout contract test

**Files:**
- Create: `frontend/test-driver-responsive.mjs`
- Test: `frontend/test-driver-responsive.mjs`

**Interfaces:**
- Consumes: `frontend/src/pages/driver/DriverLayout.jsx`, `DriverLayout.module.css`, `DriverPages.module.css`, and `DriverChat.module.css`.
- Produces: A focused Node assertion script runnable with `node test-driver-responsive.mjs`.

- [x] **Step 1: Write the failing contract test**

Assert that the driver layout exposes an accessible menu control and drawer state and that the CSS switches shell layout at `max-width: 900px`. Page-specific CSS assertions are added in Task 3 so this task can complete independently.

- [x] **Step 2: Run the test and verify it fails**

Run from `frontend`: `node test-driver-responsive.mjs`
Expected: FAIL because the mobile menu and drawer breakpoint are not implemented.

---

### Task 2: Implement the responsive driver shell and drawer

**Files:**
- Modify: `frontend/src/pages/driver/DriverLayout.jsx`
- Modify: `frontend/src/pages/driver/DriverLayout.module.css`
- Test: `frontend/test-driver-responsive.mjs`

**Interfaces:**
- Consumes: Existing driver routes, `getPageTitle()`, `handleLogout()`, and user profile data.
- Produces: A `900px`-and-under compact header with a menu button; an off-canvas drawer containing the existing driver links plus profile and logout actions; desktop sidebar behavior unchanged.

- [x] **Step 1: Add menu open/close behavior**

Add accessible drawer state; close it after route selection, outside interaction, and Escape. Keep navigation paths unchanged and expose the open state via `aria-expanded` and `aria-controls`.

- [x] **Step 2: Add responsive shell and drawer styles**

At `max-width: 900px`, remove the content's desktop sidebar offset, show the compact header/menu button, and present the existing navigation as a touch-friendly drawer with a dismissible backdrop. Keep desktop styles active above the breakpoint.

- [x] **Step 3: Run the focused contract test**

Run from `frontend`: `node test-driver-responsive.mjs`
Expected: PASS.

---

### Task 3: Finish responsive layouts for driver pages

**Files:**
- Modify: `frontend/src/pages/driver/DriverPages.module.css`
- Modify: `frontend/src/pages/driver/DriverChat.module.css`
- Test: `frontend/test-driver-responsive.mjs`

**Interfaces:**
- Consumes: The responsive shell from Task 2 and existing page components.
- Produces: Usable narrow layouts for Overview, Camera, History, Chat, and Profile without page-level horizontal scrolling.

- [x] **Step 1: Extend the contract test for page breakpoints**

Assert that the camera columns stack at narrow widths and that chat layout and driver content padding have narrow-screen rules.

- [x] **Step 2: Tune page-level responsive CSS**

At phone widths, stack camera content, tighten content padding, and preserve all page fields/actions. Keep tables or other inherently wide content contained within their own region rather than widening the document. Reuse existing profile breakpoints unless browser checks expose a driver-specific issue.

- [x] **Step 3: Run focused tests and build**

Run from `frontend`: `node test-driver-responsive.mjs` and `npm run build`
Expected: contract test passes and Vite exits with code 0.

- [x] **Step 4: Verify in the browser**

At 390px and 768px, check Overview, Camera, History, Chat, and Profile for page-level overflow; exercise drawer navigation, outside click, Escape, profile, and logout actions. At 1440px, confirm the desktop sidebar and top bar remain unchanged.
