# Button feedback design

## Intent

Make action buttons across the admin and driver interfaces give users a clear
response, especially when an action completes too quickly to be noticed.

## Goals

- Ensure every action has a visible response through changed UI state, inline
  status, loading, or a toast.
- Add success toasts only when the outcome is otherwise difficult to notice.
- Report success only after the operation succeeds; preserve or add clear error
  feedback when it fails.
- Reuse the existing toast system and page-level interaction patterns.

## Non-goals

- Do not add toasts to navigation, tabs, or controls whose changed state already
  makes the result clear.
- Do not show a toast for every click or add loading spinners to instant actions.
- Do not redesign button styling or change unrelated page behavior.

## Constraints and success criteria

- Keep existing admin and driver layout toast containers and button conventions.
- Keep existing visible status, loading, and error behavior where it already
  communicates the result.
- Check relevant frontend scripts and run the frontend build/lint checks
  available in the project.

## Approaches

1. Add a global toast to every button click. Rejected because it can claim
   success before an operation completes and creates noisy confirmations.
2. Add a generic pressed effect to the shared button component. Rejected
   because it confirms only the click, not the operation's outcome.
3. Inspect each admin and driver action and add the appropriate feedback at
   its existing handler. Selected because it reflects the actual outcome,
   avoids redundant toasts, and preserves local interaction patterns.

## Implementation calls

- Review action buttons throughout admin and driver pages.
- Retain existing state changes and inline feedback as sufficient confirmation
  when users can clearly see the result.
- Add missing success/error feedback for actions whose result is otherwise
  ambiguous, using the shared toast convention.
- Fix the missing `toast.error` helper only if needed to provide consistent
  error feedback for these actions.
