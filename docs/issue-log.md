# Issue Log

Last updated: April 14, 2026

Use this file for confirmed repo-specific issues only. Keep entries short and practical.

## I-001 Theme hotkey crash on non-keyboard events
- Problem: Theme hotkey code crashed on `event.key.toLowerCase()`.
- Cause: The handler assumed every `keydown` event had a string `key`. Plain `Event` objects can still be dispatched.
- Avoid: Treat browser events as untrusted. Guard the event shape before reading keyboard fields.
- Fix/Check: Verify `typeof event.key === "string"` before using it, then test `window.dispatchEvent(new Event("keydown"))`.

## I-002 Theme bootstrap script warning in root layout
- Problem: React/Next logged a warning about a script tag rendered from `app/layout.tsx`.
- Cause: Theme bootstrap JS was rendered inline inside the React tree in the root layout.
- Avoid: Do not inline startup theme scripts in the root layout render path.
- Fix/Check: Load the bootstrap through an external early-start script path and confirm the console warning is gone.

## I-003 Supabase Google OAuth provider disabled
- Problem: Google sign-in returned `400 validation_failed` with `Unsupported provider: provider is not enabled`.
- Cause: The app requested `provider=google`, but the target Supabase project had Google disabled and no client ID or secret configured.
- Avoid: When OAuth mode is enabled, verify the provider is enabled in the target Supabase project before testing login.
- Fix/Check: Configure the Google provider in Supabase, then confirm `/auth/login?provider=google` redirects to Google instead of returning JSON `400`.
