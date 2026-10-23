# Profile Card and Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live identity-card preview and persistent photo avatars to the shared profile experience for drivers/users and admins.

**Architecture:** Keep the existing shared `ProfilePage` and `PUT /api/auth/me` flow. Normalize selected images in the browser to small JPEG data URLs, validate and persist them as `avatarImage` on the user, and render the photo with the existing color/initial fallback at current avatar display sites.

**Tech Stack:** React 19, CSS Modules, Express 4, Mongoose 8, Node built-in assert tests.

**Spec:** `FleetGuard/docs/superpowers/specs/2026-10-24-profile-id-card-avatar-design.md`

## Global Constraints

- Do not invent a driver, employee, or account ID.
- Do not add cloud image hosting, avatar presets, or image editing beyond size normalization.
- Do not change profile fields, authentication, or password behavior beyond supporting the photo.
- Do not show unsaved profile information as if it were already saved; label the card as a preview.
- Keep the image small enough for the existing JSON API and MongoDB user document; reject invalid or oversized image data clearly.
- Reuse the existing save action and profile-update endpoint.
- No new dependencies or external image service.

## Review Focus

- Missing `avatarImage` in an update must preserve an already saved photo; test an update that omits it.
- A non-JPEG data URL or malformed base64 must be rejected without changing the saved profile; test invalid payloads.
- A decoded image larger than 512 KiB must be rejected without changing the saved profile; test the upper bound.
- A selected image that cannot be decoded or normalized must leave the current preview intact and report an error; verify the upload flow in a browser.
- Accounts without a photo must continue to show their selected background color and initial; test the fallback in the UI contract and inspect the rendered page.

---

### Task 1: Persist and validate profile photos

**Files:**
- Modify: `FleetGuard/backend/src/models/User.js`
- Modify: `FleetGuard/backend/src/routes/authRoutes.js`
- Test: `FleetGuard/backend/test-profile-update.js`

**Interfaces:**
- Consumes: existing `PUT /api/auth/me` JSON profile update.
- Produces: optional user field `avatarImage`, a JPEG base64 data URL no larger than 512 KiB decoded; omitted photo leaves the stored photo unchanged.

- [ ] **Step 1: Add failing API contract assertions**

Assert that a valid small JPEG data URL is returned by `PUT /api/auth/me`, persisted in `memoryStore.users`, and included in audit `changedFields`. Assert that an omitted `avatarImage` preserves the existing photo. Assert that a non-JPEG/malformed payload and a decoded payload over 512 KiB return 400 and leave profile state unchanged.

- [ ] **Step 2: Run the focused API test and confirm the expected failure**

Run from `FleetGuard\backend`: `node test-profile-update.js`

Expected: FAIL because the endpoint currently rejects `avatarImage` as an unknown field.

- [ ] **Step 3: Implement the optional field and validation**

Add `avatarImage` to the user schema and profile allowlist. Validate the JPEG data URL, base64 payload, JPEG signature, and decoded 512 KiB limit. Update the stored value and audit field only when the property is supplied; include it in `publicUser`.

- [ ] **Step 4: Re-run the focused API test**

Run from `FleetGuard\backend`: `node test-profile-update.js`

Expected: PASS, including existing phone, date-of-birth, password, and protected-field assertions.

### Task 2: Add the responsive live profile card and photo picker

**Files:**
- Modify: `FleetGuard/frontend/src/pages/profile/ProfilePage.jsx`
- Modify: `FleetGuard/frontend/src/pages/profile/ProfilePage.module.css`
- Modify: `FleetGuard/frontend/src/context/AuthContext.jsx`
- Test: `FleetGuard/frontend/test-profile-page.mjs`

**Interfaces:**
- Consumes: `user.avatarImage`, `user.avatarColor`, account role, and existing profile form state.
- Produces: an accessible image picker that normalizes a chosen image to a square JPEG data URL (maximum 512 KiB), a card preview synchronized to pending form values, and the same optional `avatarImage` in the existing save request.

- [ ] **Step 1: Add failing profile UI contract assertions**

Assert that the shared page retains both protected routes, exposes an image picker accepting images, previews the selected profile photo and current form fields, sends `avatarImage` on save, and gives the preview a distinct accessible label.

- [ ] **Step 2: Run the frontend profile contract test and confirm the expected failure**

Run from `FleetGuard\frontend`: `node test-profile-page.mjs`

Expected: FAIL on the missing picker/preview contract, not a test setup error.

- [ ] **Step 3: Implement image selection and live preview**

Add client-side image decoding and center-square JPEG normalization at 256×256. Reject source files over 10 MiB and normalized images over 512 KiB with a visible message; do not replace a working preview on failure. Add the current avatar image to form state and save it through the existing submit handler. Render avatar, name, localized role, email, and phone on the preview card, falling back to the chosen avatar color and initial when no photo exists.

- [ ] **Step 4: Implement the responsive layout**

Widen the shared profile page to a form column plus a right preview column on desktop; stack the preview after the form below the tablet breakpoint. Keep the save action and all existing profile/password behavior unchanged.

- [ ] **Step 5: Re-run the frontend profile contract test**

Run from `FleetGuard\frontend`: `node test-profile-page.mjs`

Expected: PASS for both normal and admin profile routes.

### Task 3: Render saved photos at existing avatar sites

**Files:**
- Modify: `FleetGuard/frontend/src/pages/admin/AdminLayout.jsx`
- Modify: `FleetGuard/frontend/src/pages/driver/DriverLayout.jsx`
- Modify: `FleetGuard/frontend/src/pages/admin/AdminEmployees.jsx`
- Modify: `FleetGuard/frontend/src/pages/admin/AdminCameras.jsx`
- Test: `FleetGuard/frontend/test-profile-page.mjs`

**Interfaces:**
- Consumes: optional `avatarImage`, `avatarColor`, and name on current-user and driver records.
- Produces: saved photos wherever those records currently render an initial, with the current initials/color fallback when there is no image.

- [ ] **Step 1: Add failing avatar-rendering contract assertions**

Assert that the admin and driver account headers and the admin employee/camera driver identity blocks use `avatarImage` when present and retain an initial fallback.

- [ ] **Step 2: Run the frontend profile contract test and confirm the expected failure**

Run from `FleetGuard\frontend`: `node test-profile-page.mjs`

Expected: FAIL on the missing image-rendering contract.

- [ ] **Step 3: Render the saved photo at each existing avatar site**

Use the photo as an object-fit image while preserving each site's existing shape, dimensions, color, and initial fallback.

- [ ] **Step 4: Run focused verification**

Run from `FleetGuard\frontend`: `node test-profile-page.mjs`, then `npm run lint -- src/pages/profile/ProfilePage.jsx src/pages/admin/AdminLayout.jsx src/pages/driver/DriverLayout.jsx src/pages/admin/AdminEmployees.jsx src/pages/admin/AdminCameras.jsx` and `npm run build`.

Expected: profile contract PASS, lint succeeds, and Vite completes a production build.

- [ ] **Step 5: Inspect desktop and phone layouts**

Run the frontend and inspect the profile at desktop and 390px widths. Confirm the card is to the right on desktop, follows the form on mobile, selected photos preview before saving, and accounts without photos retain the color/initial fallback.
