# Dead Air — local event companion

A Next.js site for the Dead Air physical mystery. It includes organizer operations, participant sign-in, team-generated passwords, organizer-issued hints, final theory submissions, winner tracking, and Echo.

## Run a local rehearsal

Requirements: Node.js and npm.

1. Copy the environment template:

   ```sh
   cp .env.example .env.local
   ```

2. In `.env.local`, set:

   ```env
   DRY_RUN=true
   NEXT_PUBLIC_DRY_RUN=true
   ADMIN_EMAIL=your-organizer-email
   ADMIN_PASSWORD=your-local-password
   SESSION_SECRET=use-a-random-secret-at-least-32-characters-long
   ```

3. Install and start:

   ```sh
   npm install
   npm run dev
   ```

4. Open [http://127.0.0.1:3000/login](http://127.0.0.1:3000/login). Sign in as the organizer, create a team, and use the generated team name and password in a separate browser session to try the participant portal.

Local rehearsal data is kept in memory and resets when the development server restarts. Echo uses local rehearsal responses; add an AI provider key for live AI responses.

## Supabase setup for a live event

1. Create a dedicated Supabase project for the event.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in that project's SQL editor.
3. Create the organizer account in Supabase Authentication.
4. Add the project's URL, anon key, service-role key, AI provider key, and a random `SESSION_SECRET` to `.env.local`.
5. Set `DRY_RUN=false` and `NEXT_PUBLIC_DRY_RUN=false`, then restart the app.

Keep service-role and AI keys server-side. Do not use the separately supplied schema with public team write policies or plaintext admin passwords.

## Participant experience

The portal shows the team's status, organizer-issued hints, Echo, and final theory submission. Case evidence files are not listed in the participant UI. Organizers can send a Nudge, Direction, or Strong hint to one team; the portal refreshes team updates automatically.

## Included source

`app/` contains pages and route handlers; `lib/` contains team sessions, case context, and rehearsal state; `supabase/schema.sql` defines the live database; `public/event-poster.png` is the event artwork. No `.env.local`, API keys, `node_modules`, `.next`, or external source-package files are included.
