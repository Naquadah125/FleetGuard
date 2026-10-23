# Driver mobile UI design

## Intent

Make every User/driver screen usable on phone-sized viewports. The fixed desktop sidebar currently takes most of a 390px screen and leaves too little room for page content, including the live camera view.

## Goals

- Keep the current desktop layout and visual identity.
- On narrow screens, replace the fixed sidebar with a compact top bar and an openable navigation drawer.
- Make driver overview, camera, history, chat, and profile layouts readable and operable without page-level horizontal scrolling.
- Keep navigation and account actions reachable with touch and keyboard.

## Non-goals

- Change the Admin interface or redesign desktop pages.
- Change routes, business behavior, or page content.
- Rebuild page-level data tables beyond the responsive changes required to prevent page overflow.

## Approaches

1. **Top bar and navigation drawer — selected.** Gives pages the full phone width and preserves vertical space for the camera; switching screens takes an extra tap.
2. **Fixed bottom navigation.** Makes four destinations one-tap but consumes persistent vertical space and risks competing with camera controls.
3. **Collapsed icon rail.** Requires fewer structural changes but still permanently narrows the content and hides labels on a phone.

## Design decisions

- Apply the mobile shell only to Driver routes; retain the existing desktop sidebar.
- At phone widths, use a top bar with the current screen title and a menu control. The drawer contains driver destinations and account actions.
- The drawer closes after navigation, on outside interaction, and with Escape; expose its open state accessibly.
- Stack or resize page content at phone and tablet breakpoints while preserving all existing functionality.

## Verification

- Check driver overview, camera, history, chat, and profile at 390px and 768px; ensure the page itself does not scroll horizontally.
- Check the desktop layout at 1440px to confirm the existing sidebar remains intact.
- Verify menu open/close, route selection, and account actions with browser interaction; run focused frontend tests and build.
