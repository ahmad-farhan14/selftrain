# SelfTrain

A mobile-first workout and daily nutrition tracker built with Next.js, TypeScript, Tailwind CSS, and Supabase. The app works without Supabase using browser LocalStorage; Google sign-in enables cloud storage for the active workout and log entries.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Run `npm run build` and `npm run typecheck` to validate a production build and TypeScript.

## Supabase setup

1. Create a Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL Editor. Re-run it on existing SelfTrain projects to add the daily-activity table and refresh RLS policies. It creates the profile, workout, nutrition, custom-exercise, active-workout, and daily-activity tables and the new-user profile trigger.
2. In **Authentication → Providers**, enable Google and configure the OAuth client ID and secret. Add the local app URL and your deployed URL to Supabase's allowed redirect URLs.
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon/public key:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Restart the Next.js server and use **Connect Google** to sign in.

Workout state, custom exercises, nutrition logs, timer preferences, login streaks, and activity calendar are saved locally first. When signed in, the active snapshot, daily check-in/workout activity, and individual completed set/food entries are also written to Supabase. The browser client only uses the public anon key; row-level security restricts data to its authenticated owner.

## Core features

- Responsive desktop sidebar and mobile bottom navigation in a dark emerald-accented theme.
- Starter workout templates including a no-equipment calisthenics plan, custom exercises, per-set weight/reps, completion, form guides, stopwatch, and configurable rest timer.
- Daily login streak, workout calendar, and a first-visit streak reward.
- Calorie and macro goals, one-tap calorie/protein presets, and manual food logging.
- LocalStorage persistence with optional Supabase Auth and database sync.
