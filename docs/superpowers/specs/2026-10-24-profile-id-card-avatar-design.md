# Profile card and avatar design

## Intent

Use the empty space beside profile settings for a live identity-card preview, and let users set a
real avatar photo. The existing shared profile page serves both drivers/users and admins.

## Goals

- Keep the existing profile form and place a live preview beside it on wider screens; stack it below
  the form on narrow screens.
- Show only known profile information: avatar, name, account role, email, and phone.
- Allow selecting a local image, preview it immediately, and persist it with the profile.
- Show the saved image in the account avatar wherever the current user's initials appear, while
  retaining the selected color and initials as the no-photo fallback.
- Apply the same profile experience to normal and admin accounts through the shared page.

## Non-goals and anti-goals

- Do not invent a driver, employee, or account ID.
- Do not add cloud image hosting, avatar presets, or image editing beyond size normalization.
- Do not change profile fields, authentication, or password behavior beyond supporting the photo.
- Do not show unsaved profile information as if it were already saved; label the card as a preview.

## Constraints

- The backend currently persists `avatarColor` but has no photo field or image-storage service.
- Keep the image small enough for the existing JSON API and MongoDB user document; reject invalid or
  oversized image data clearly.
- Reuse the existing save action and profile-update endpoint.

## Approaches

1. **Live preview with a compact image stored in the user profile (selected).** Keeps the preview
   synchronized with edits, persists the photo without new services or dependencies, and supports
   both account routes. It requires client-side image normalization and a strict size limit.
2. **Upload to external object storage.** Scales better for larger images, but requires a provider,
   credentials, and deployment configuration not present in this project.
3. **Preset avatars only.** Avoids image persistence but does not let users choose their own photo.

The user chose the live preview and upload-persist behavior. The builder may choose the exact
normalized format and conservative size cap, provided the existing JSON request limit is respected.

## Verification

- Extend profile UI and API contract tests for both role routes, photo persistence, and invalid image
  rejection.
- Run the focused profile tests, frontend lint, and frontend production build.
- Inspect the rendered profile at desktop and phone widths when the browser environment is available.
