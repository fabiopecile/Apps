# TeamUp11

A Bundesliga-style **Tippspiel × Social Media** app: predict match scores, earn points and XP, post from the stadium, chat with friends, and climb the leaderboard. Built with **Expo (React Native) + Supabase**.

## Features

- ⚽️ **Tipps** — predict scores per matchday; pick one of three Jokers (Risiko/Boost/Sicher) to change how that tip scores. Tips lock at kickoff and are scored automatically when results are entered.
- 🔥 **Login-Streak** — opening the app on consecutive days builds a streak; every 7 days in a row grants **+100 XP and +1 Joker**.
- 🎡 **Tägliches Glücksrad** — one free spin per day for XP, a Joker, Coins, a Booster (doubles your next tip's points), or an exclusive Titel.
- ⚔️ **Duelle** — challenge a friend to a Tipp-Duell, Punktewettkampf (XP) or Streak-Battle for a matchday, either from the Duelle tab or directly as a card in a chat; winner gets **+30 XP**.
- 📸 **Feed** — Instagram-style posts with stories (full-screen viewer), double-tap-to-like, comments, and follows; posting earns **+50 XP** and levels you up.
- 💬 **Chat** — 1:1 conversations with realtime messages and inline challenge cards.
- 🤝 **Freundschaftsanfragen** — send/accept friend requests; accepting makes you mutual "Freunde" for the Ranking tab.
- 🏆 **Ranking** — overall and friends-only leaderboards with a podium for the top 3.
- 👤 **Profil** — stats, coins, equipped title, badges, settings (dark mode, notifications, language), and your own posts.

## Tech stack

- [Expo](https://expo.dev) (SDK 57) + [Expo Router](https://docs.expo.dev/router/introduction/) for navigation
- [Supabase](https://supabase.com) for Postgres, Auth, Realtime and Storage
- TypeScript, React Native `StyleSheet` (no UI kit dependency), `react-native-svg` for the wheel

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run the migration files in `supabase/migrations/` **in order**:
   - `0001_init.sql` — tables, RLS policies, triggers (XP, joker budget, tip scoring)
   - `0002_seed.sql` — demo leagues/matches/badges so the app isn't empty
   - `0003_storage.sql` — the `post-images` storage bucket + policies
   - `0004_streaks_and_duels.sql` — login-streak columns/RPC, the `duels` table + `duel_scores` view, and the extended scoring trigger that settles duels
   - `0005_wheel_joker_types_duel_types_friends.sql` — 3 joker types + booster, the Glücksrad (`spin_wheel` RPC), coins/titles, xp/streak duel types, chat-linked duels, and friend requests
   - `0006_match_external_ids.sql` — a unique `external_id` column on `matches`, needed by the optional football-data.org sync below
3. In **Project Settings → API**, copy the **Project URL** and **anon public key**.

> Already on an older project? Each migration is additive — just run whichever ones you haven't applied yet, in order.

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

## 4. (Optional) Real fixtures via football-data.org

By default the Bundesliga matchday in Tipps is whatever's in `0002_seed.sql` (fake demo matches). To pull real fixtures/results for Bundesliga, Premier League and La Liga automatically, deploy the included Supabase Edge Function `supabase/functions/sync-football-data`. It fetches the current matchday from [football-data.org](https://www.football-data.org)'s free tier and upserts it into `matchdays`/`matches` — your existing scoring trigger takes it from there.

1. **Get a free API token**: sign up at [football-data.org/client/register](https://www.football-data.org/client/register), copy the token from the confirmation email.
2. **Get a Supabase Personal Access Token**: Supabase dashboard → your account avatar (top right) → **Access Tokens** → generate one, copy it.
3. **Find your project ref**: Supabase dashboard → **Project Settings → General** → **Reference ID**.
4. In the Codespace/terminal, from the project root:
   ```bash
   export SUPABASE_ACCESS_TOKEN=your-personal-access-token
   npx supabase link --project-ref your-project-ref
   npx supabase secrets set FOOTBALL_DATA_API_TOKEN=your-football-data-token
   npx supabase functions deploy sync-football-data --no-verify-jwt
   ```
5. **Schedule it**: Supabase dashboard → **Database → Cron Jobs** → new cron job → type "Edge Function" (or "HTTP Request" pointing at `https://your-project-ref.supabase.co/functions/v1/sync-football-data` if your dashboard doesn't have the Edge Function type) → pick `sync-football-data` → schedule `0 * * * *` (hourly) → save.

To test it once by hand before scheduling: `npx supabase functions invoke sync-football-data`.

Only Bundesliga/Premier League/La Liga are wired up (matching the `leagues` table); add more by extending the `COMPETITIONS` map at the top of `supabase/functions/sync-football-data/index.ts` and inserting a matching row into `leagues`.

## Project structure

```
app/                  Expo Router routes (file-based)
  (auth)/              login, signup
  (tabs)/              Feed, Tipps, Chat, Ranking, Profil
  chat/[id].tsx         conversation screen (incl. challenge cards)
  chat/new.tsx           start a conversation / send a friend request
  post/new.tsx           create a post (+50 XP)
  duels/index.tsx        your duels (invites, active, history)
  duels/new.tsx           challenge a friend to a Tipp-Duell
  friends/requests.tsx    incoming friend requests
components/           reusable UI pieces (wheel, joker picker, story viewer, comments, confetti, ...)
hooks/                 Supabase data hooks (posts, tips, ranking, chat, duels, streak, wheel, friends, ...)
contexts/AuthContext.tsx  session + profile state
lib/                   Supabase client, generated-style types, storage upload, wheel geometry
constants/             theme (colors/spacing), game constants, wheel prize table
supabase/migrations/   SQL schema, seed data, storage policies
supabase/functions/    sync-football-data — optional real-fixtures sync (Edge Function)
```

## Game rules implemented in SQL

- Posting a beitrag → `+50 XP`, leveling up every `1000 XP` (`handle_new_post`).
- **Jokers** (start at 3, topped up by streak rewards and the wheel) — pick one per tip:
  - 🎲 Risiko: correct tip's points multiplied by a random 0.5×–1.5×
  - ⚡ Boost: correct tip's points ×2
  - 🛡️ Sicher: a wrong tip still scores 1 point instead of 0
- **Booster** (won on the wheel): doubles whatever the *next* tip you place scores, consumed automatically on that tip.
- Base scoring, once a match's result is entered (`status = 'finished'`): exact score → 5 points, correct tendency → 3 points, otherwise 0 — before Joker/Booster multipliers.
- Tips are only visible to their author until the match kicks off, then revealed to everyone (classic Tippspiel fairness rule).
- **Login-Streak** (`claim_daily_login` RPC, called once per app open): +1 for a login the day after the last one, resets to 1 on a gap, every 7th day grants `+100 XP` and `+1 Joker`.
- **Glücksrad** (`spin_wheel` RPC, once per UTC day): server picks one of 12 prizes (XP, Joker, Coins, Booster, or a Titel) and applies it atomically — the client's wheel animation just lands on whichever index the server returns, so it can't be gamed.
- **Duelle**: challenge a friend (from the Duelle tab or a chat) to one of three types for a matchday — `tips` (who scores more from their tips), `xp` (who gains more XP during the duel), or `streak` (who has the longer login streak). The opponent accepts/declines; once every match in that matchday is `finished`, the scoring trigger settles the duel, sets `winner_id`, and pays the winner `+30 XP`.
- **Freundschaftsanfragen**: accepting a request inserts mutual `follows` rows in both directions, which is what the Ranking tab's "Freunde" scope reads from.

To advance a matchday for testing, update a match's `status`, `home_score` and `away_score` in the Supabase table editor — the trigger scores every tip for that match automatically, and also settles any duels tied to that matchday once it's fully finished.
