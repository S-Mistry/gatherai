# GatherAI

Next.js application for the AI Workshop Discovery Interviewer MVP.

## Scripts
- `npm run dev`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Environment
Copy `.env.example` and fill in the Supabase, OpenAI, Braintrust, and cron variables.

## Architecture
- Consultant app routes live under `app/app`
- Participant routes live under `app/i/[linkToken]`
- Public participant APIs live under `app/api/public`
- Internal analysis recovery lives under `app/api/internal`
- Shared types live under `lib/domain/types.ts`
- Supabase schema lives under `supabase/migrations/0001_mvp_schema.sql`
