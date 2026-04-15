# GatherAI

Next.js application for the AI Workshop Discovery Interviewer MVP.

## Scripts
- `npm run dev`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run supabase:bootstrap`

## Environment
Copy `.env.example` and fill in the runtime Supabase, OpenAI, Braintrust, recovery-token, and cron variables.

If consultant auth stays on the default Google OAuth mode:
- create a Web OAuth client in Google Auth Platform
- add your app origin to Authorized JavaScript origins, including `http://localhost:3000` for local development
- add `${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback` as the Google OAuth redirect URI
- add `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` locally before running `npm run supabase:bootstrap`, or configure the same values manually in Supabase Dashboard > Auth > Providers > Google

`npm run supabase:bootstrap` updates the Supabase `site_url` and redirect allow-list to include your app callback URLs such as `${NEXT_PUBLIC_APP_URL}/auth/callback`.

## Architecture
- Consultant app routes live under `app/app`
- Participant routes live under `app/i/[linkToken]`
- Public participant APIs live under `app/api/public`
- Internal analysis recovery lives under `app/api/internal`
- Shared types live under `lib/domain/types.ts`
- Supabase schema lives under `supabase/migrations/0001_mvp_schema.sql`
