# TeamUp11

A Bundesliga-style **Tippspiel × Social Media** app: predict match scores, earn points and XP, post from the stadium, chat with friends, and climb the leaderboard. Built with **Expo (React Native) + Supabase**.

## Features

- ⚽️ **Tipps** — predict scores per matchday, use a limited "Joker" to double points, tips lock automatically at kickoff and are scored automatically when results are entered.
- 📸 **Feed** — Instagram-style posts with stories, likes and follows; posting earns **+50 XP** and levels you up.
- 💬 **Chat** — 1:1 conversations with realtime message delivery.
- 🏆 **Ranking** — overall and friends-only leaderboards with a podium for the top 3.
- 👤 **Profil** — stats (tips, hit quote, points), badges, settings (dark mode, notifications, language), and your own posts.

## Tech stack

- [Expo](https://expo.dev) (SDK 57) + [Expo Router](https://docs.expo.dev/router/introduction/) for navigation
- [Supabase](https://supabase.com) for Postgres, Auth, Realtime and Storage
- TypeScript, React Native `StyleSheet` (no UI kit dependency)

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run the three migration files in `supabase/migrations/` **in order**:
   - `0001_init.sql` — tables, RLS policies, triggers (XP, joker budget, tip scoring)
   - `0002_seed.sql` — demo leagues/matches/badges so the app isn't empty
   - `0003_storage.sql` — the `post-images` storage bucket + policies
3. In **Project Settings → API**, copy the **Project URL** and **anon public key**.

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in the two values from step 1:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Run it

```bash
npm install
npm run start   # then press i (iOS), a (Android) or w (web)
```

Sign up with an email/password in the app — a profile row is created automatically. If your Supabase project has email confirmation enabled, confirm via the email link before logging in.

## Project structure

```
app/                  Expo Router routes (file-based)
  (auth)/              login, signup
  (tabs)/              Feed, Tipps, Chat, Ranking, Profil
  chat/[id].tsx         conversation screen
  chat/new.tsx          start a new conversation
  post/new.tsx           create a post (+50 XP)
components/           reusable UI pieces
hooks/                 Supabase data hooks (posts, tips, ranking, chat, ...)
contexts/AuthContext.tsx  session + profile state
lib/                   Supabase client, generated-style types, storage upload
constants/             theme (colors/spacing) and game constants
supabase/migrations/   SQL schema, seed data, storage policies
```

## Game rules implemented in SQL

- Posting a beitrag → `+50 XP`, leveling up every `1000 XP` (`handle_new_post`).
- 3 Jokers per player; a Joker doubles the points earned for that tip (`handle_new_tip`).
- Scoring, once a match's result is entered (`status = 'finished'`):
  - exact score → 5 points
  - correct tendency (win/draw/loss) → 3 points
  - otherwise → 0 points
  - doubled if the tip was a Joker
- Tips are only visible to their author until the match kicks off, then they're revealed to everyone (classic Tippspiel fairness rule).

To advance a matchday for testing, update a match's `status`, `home_score` and `away_score` in the Supabase table editor — the trigger scores every tip for that match automatically.
