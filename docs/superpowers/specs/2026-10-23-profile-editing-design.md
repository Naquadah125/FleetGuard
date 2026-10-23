# FleetGuard Profile Editing Design

## Intent

Give Admin and Driver/User accounts a reliable way to edit their own profile
from the existing user dropdown. Profile data must persist in the backend
database and remain synchronized with the frontend session.

## Goals

- Add “Chỉnh sửa thông tin” to both Admin and Driver/User dropdowns.
- Navigate to a profile page using role-specific routes:
  `/admin/profile` and `/driver/profile`.
- Reuse one `ProfilePage` implementation for both roles.
- Allow editing name, phone number, date of birth, and avatar color.
- Display the login email as read-only.
- Allow password changes using current password, new password, and confirmation.
- Validate required fields, phone format, date-of-birth range, and password match.
- Record a profile-update audit event without storing or logging passwords.
- Persist updates through an authenticated `/api/auth/me` API.

## Non-goals

- Admins cannot edit another user's profile from their own dropdown.
- Login email cannot be changed from this feature.
- Organization, role, employee status, and permissions cannot be changed here.
- No address, identity-number, emergency-contact, or other extra profile fields.
- No password values in audit metadata, logs, responses, or local storage.

## Approach

Use one authenticated profile API and one shared React page. The Admin and
Driver layouts provide different route entry points, while the page reads the
current user from `AuthContext` and saves through `/api/auth/me`.

Alternative frontend-only localStorage updates are rejected because they do
not persist across devices and would diverge from the backend source of truth.
Separate Admin and Driver implementations are rejected because they duplicate
validation and create inconsistent security behavior.

## Decisions

- Profile routes are `/admin/profile` and `/driver/profile`.
- The page uses existing CSS Modules, layout shell, toast, and auth context
  conventions.
- A successful profile save updates the authenticated user in context and
  `fleet_user` local storage.
- Password changes are part of the same page but submitted only when the user
  enters password fields.
- The backend verifies the current password before replacing the hash.
- Password fields are cleared after success or failed submission.
- Audit action is `UPDATE_PROFILE`; metadata contains changed field names only.
- Audit persistence is best-effort and cannot make a successful profile update
  fail.
- The API rejects attempts to change email, organization, role, or other
  protected fields.
- Backend-authenticated accounts are required for this feature; mock/local
  fallback accounts do not receive a false-success local-only update.
- Phone is required and must be a Vietnamese 10-digit number beginning with
  `0`.
- Date of birth is entered and stored as `DD-MM-YYYY`; the date must represent
  an age from 16 through 100.
- Profile and password validation is atomic: invalid password input leaves all
  profile fields unchanged.

## API shape

`PUT /api/auth/me`

```json
{
  "name": "Nguyen Van A",
  "phone": "0901234567",
  "dateOfBirth": "12-04-1998",
  "avatarColor": "#2563eb",
  "currentPassword": "••••••••",
  "newPassword": "••••••••",
  "confirmPassword": "••••••••"
}
```

The response returns the sanitized updated user without `passwordHash`.
`currentPassword`, `newPassword`, and `confirmPassword` are never returned.

## Verification

- Frontend contract tests cover both role routes and the profile payload.
- Backend tests cover self-only authorization, protected-field rejection,
  profile validation, password verification, and sanitized responses.
- Frontend lint/build and backend syntax/tests must pass.
- Manual check confirms both dropdowns navigate correctly and a saved profile
  survives refresh.
