// Photographs the REAL app screens for the promo film.
//
// The app is the web export in ../../dist. It talks to Supabase over fetch, so
// instead of a live database this intercepts those calls and answers with a
// staged season: a full matchday, a feed, a ranking. The screens are the
// app's own components at their own sizes - nothing here redraws the UI, it
// only decides what data it is holding.
//
//   npx expo export --platform web           (from the repo root, once)
//   node capture-screens.js
//
// Screenshots land in ./screens. Replace any of them with a real screenshot
// from a phone and the film picks it up unchanged.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DIST = path.join(__dirname, '..', '..', 'dist');
const OUT = path.join(__dirname, 'screens');
const PROJECT_REF = 'umloscgynmfswifbnmuy';
const WIDTH = 430;
const HEIGHT = 932; // iPhone 15 Pro Max logical size

const now = Date.now();
const inHours = (h) => new Date(now + h * 3600e3).toISOString();
const agoHours = (h) => new Date(now - h * 3600e3).toISOString();

const ME = 'aaaaaaaa-0000-4000-8000-000000000001';

function person(id, username, name, points, correct, tips) {
  return {
    id,
    username,
    display_name: name,
    avatar_url: null,
    bio: null,
    xp: 4200,
    level: 5,
    points,
    tips_count: tips,
    correct_tips_count: correct,
    jokers_remaining: 2,
    is_pro: false,
    pro_until: null,
    is_admin: false,
    notifications_enabled: true,
    reminder_hour_utc: 17,
    login_streak: 6,
    last_login_date: null,
    last_post_xp_date: null,
    coins: 480,
    purchased_coins: 0,
    booster_charges: 0,
    equipped_title: null,
    equipped_frame_color: null,
    last_wheel_spin_date: null,
    onboarding_done: true,
    created_at: agoHours(900),
    referral_code: 'FABIO11',
  };
}

const PEOPLE = [
  person(ME, 'fabio', 'Fabio', 412, 61, 148),
  person('aaaaaaaa-0000-4000-8000-000000000002', 'sandra', 'Sandra', 468, 70, 152),
  person('aaaaaaaa-0000-4000-8000-000000000003', 'thomas', 'Thomas', 389, 55, 141),
  person('aaaaaaaa-0000-4000-8000-000000000004', 'lukas', 'Lukas', 355, 50, 138),
  person('aaaaaaaa-0000-4000-8000-000000000005', 'marie', 'Marie', 331, 47, 129),
];

const LEAGUES = [
  { id: 'l1', code: 'BL1', name: 'Bundesliga', flag_emoji: '🇩🇪', sort_order: 1 },
  { id: 'l2', code: 'ADM', name: 'Admiral', flag_emoji: '🇦🇹', sort_order: 2 },
  { id: 'l3', code: 'PL', name: 'Premier League', flag_emoji: '🏴', sort_order: 3 },
];

const MATCHDAYS = [
  { id: 'm23', league_id: 'l1', number: 23, deadline: agoHours(200) },
  { id: 'm24', league_id: 'l1', number: 24, deadline: inHours(30) },
  { id: 'm25', league_id: 'l1', number: 25, deadline: inHours(200) },
];

const FIXTURES = [
  ['Bayern München', 'Dortmund', 30, 2, 1],
  ['Leverkusen', 'RB Leipzig', 32, 1, 1],
  ['Stuttgart', 'Frankfurt', 33, 3, 0],
  ['Union Berlin', 'Freiburg', 54, null, null],
  ['Wolfsburg', 'Mainz', 56, 2, 2],
];

const MATCHES = FIXTURES.map((f, i) => ({
  id: 'mt' + i,
  matchday_id: 'm24',
  home_team: f[0],
  away_team: f[1],
  kickoff: inHours(f[2]),
  home_score: null,
  away_score: null,
  status: 'scheduled',
  external_id: null,
  tips: f[3] === null ? [] : [{
    id: 'tp' + i,
    user_id: ME,
    match_id: 'mt' + i,
    home_score: f[3],
    away_score: f[4],
    is_joker: i === 0,
    joker_type: i === 0 ? 'boost' : null,
    booster_applied: false,
    points_earned: null,
    created_at: agoHours(3),
    updated_at: agoHours(3),
  }],
}));

// The feed reads `caption`, and derives the like count from the joined
// post_likes rows - a like_count column would simply be ignored.
function post(id, author, caption, location, likes, hours) {
  return {
    id,
    user_id: author.id,
    image_url: null,
    image_urls: null,
    image_aspect_ratio: 1,
    caption,
    location,
    created_at: agoHours(hours),
    profiles: author,
    post_likes: Array.from({ length: likes }, (_, i) => ({ user_id: 'like' + i })),
  };
}

let PITCH_A = null, PITCH_B = null;

const POSTS = [
  post('p1', PEOPLE[1], 'Auswärts in Graz. 2:1 getippt und keine Sekunde daran gezweifelt.', 'Merkur Arena', 24, 2),
  post('p2', PEOPLE[2], 'Boost-Joker auf Bayern. Wenn das schiefgeht, meldet euch nicht bei mir.', null, 41, 5),
  post('p3', PEOPLE[4], 'Platz 2 im Monat. Sandra, ich komme.', null, 18, 9),
];

const PRIZE = {
  period: new Date(now).toISOString().slice(0, 8) + '01',
  title: '1 Jahr Pro gratis',
  description: 'Platz 1 bekommt ein Jahr Pro, Platz 2 ein halbes, Platz 3 drei Monate.',
  sponsor_name: null,
  sponsor_url: null,
  image_url: null,
  places: 3,
  min_tips: 10,
  created_at: agoHours(300),
};

const RANKING = [PEOPLE[1], PEOPLE[0], PEOPLE[2], PEOPLE[3], PEOPLE[4]].map((p, i) => ({
  id: p.id,
  username: p.username,
  display_name: p.display_name,
  avatar_url: null,
  equipped_frame_color: null,
  equipped_title: null,
  is_pro: false,
  points: [148, 132, 119, 104, 96][i],
  correct_tips: [22, 19, 17, 15, 14][i],
  tips_count: [34, 34, 33, 34, 32][i],
}));

// A PostgREST path plus its query is enough to know what was asked for.
function answer(url) {
  const p = url.pathname;
  const q = url.searchParams;

  if (p.endsWith('/auth/v1/user')) return { user: PEOPLE[0] };
  if (p.includes('/auth/v1/token')) {
    return { access_token: 'demo', token_type: 'bearer', expires_in: 3600, refresh_token: 'demo', user: PEOPLE[0] };
  }

  if (p.endsWith('/rest/v1/profiles')) {
    const id = (q.get('id') || '').replace('eq.', '');
    const found = PEOPLE.find((x) => x.id === id);
    return found ? [found] : PEOPLE;
  }
  if (p.endsWith('/rest/v1/leagues')) return LEAGUES;
  if (p.endsWith('/rest/v1/matchdays')) {
    const lid = (q.get('league_id') || '').replace('eq.', '');
    return MATCHDAYS.filter((m) => !lid || m.league_id === lid);
  }
  if (p.endsWith('/rest/v1/matches')) return MATCHES;
  if (p.endsWith('/rest/v1/posts')) {
    // The tiles are drawn after this module is evaluated, so they have to be
    // stitched in at request time rather than baked into POSTS.
    return POSTS.map((x, i) => ({ ...x, image_url: i === 0 ? PITCH_A : i === 2 ? PITCH_B : null }));
  }
  if (p.endsWith('/rest/v1/monthly_prizes')) return [PRIZE];
  if (p.endsWith('/rest/v1/stories')) return [];
  if (p.endsWith('/rest/v1/ads')) return [];
  if (p.endsWith('/rest/v1/tip_insurances')) return [];
  if (p.endsWith('/rest/v1/duels')) return [];
  if (p.endsWith('/rest/v1/follows')) return [];
  if (p.endsWith('/rest/v1/blocks')) return [];
  if (p.endsWith('/rest/v1/conversations')) return [];
  if (p.endsWith('/rest/v1/conversation_participants')) return [];
  if (p.endsWith('/rest/v1/badges') || p.endsWith('/rest/v1/user_badges')) return [];
  if (p.includes('/rest/v1/rpc/monthly_ranking')) return RANKING;
  if (p.includes('/rest/v1/rpc/')) return [];

  return [];
}

async function makeTile(page, hue) {
  await page.setViewportSize({ width: 540, height: 540 });
  await page.setContent(
    '<div style="width:540px;height:540px;background:' +
    'radial-gradient(120% 90% at 50% -10%, ' + hue + ' 0%, rgba(0,0,0,0) 60%),' +
    'repeating-linear-gradient(90deg,#0d1a10 0 46px,#0f1e12 46px 92px),' +
    '#0B0B0E;position:relative">' +
    '<div style="position:absolute;left:0;right:0;top:38%;height:2px;background:rgba(255,255,255,0.16)"></div>' +
    '<div style="position:absolute;left:34%;right:34%;top:24%;bottom:24%;border:2px solid rgba(255,255,255,0.14);border-radius:6px"></div>' +
    '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,0.55) 100%)"></div>' +
    '</div>'
  );
  const buf = await page.screenshot({ type: 'jpeg', quality: 80 });
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

const SHOTS = [
  { name: '01-feed', path: '/(tabs)' },
  { name: '02-tipps', path: '/(tabs)/tipps' },
  { name: '03-ranking', path: '/(tabs)/ranking' },
  { name: '04-profil', path: '/(tabs)/profil' },
  { name: '05-regeln', path: '/rules' },
  { name: '06-regeln-joker', path: '/rules', scroll: 620 },
];

(async () => {
  if (!fs.existsSync(DIST)) {
    console.error('dist/ fehlt. Zuerst im Repo-Wurzelverzeichnis: npx expo export --platform web');
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 2,
  });

  // Every Supabase call, answered from the staged season above.
  await context.route('**/*.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let body = answer(url);

    // .single() / .maybeSingle() ask for one object, not an array of one. An
    // array back parses as "no row", which is why the profile came through
    // empty and the header showed level 1 with no jokers.
    const accept = request.headers()['accept'] || '';
    if (accept.includes('vnd.pgrst.object') && Array.isArray(body)) {
      body = body[0] ?? null;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify(body),
    });
  });

  const page = await context.newPage();

  PITCH_A = await makeTile(page, 'rgba(229,72,77,0.55)');
  PITCH_B = await makeTile(page, 'rgba(91,141,239,0.5)');
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });

  await page.goto('http://127.0.0.1:8099/');

  // A stored session is what makes the app boot signed in; without it every
  // route bounces to the login screen before any data is ever requested.
  await page.evaluate(([ref, user]) => {
    localStorage.setItem('sb-' + ref + '-auth-token', JSON.stringify({
      access_token: 'demo', refresh_token: 'demo', token_type: 'bearer',
      expires_in: 360000, expires_at: Math.floor(Date.now() / 1000) + 360000,
      user,
    }));
  }, [PROJECT_REF, PEOPLE[0]]);

  for (const shot of SHOTS) {
    await page.goto('http://127.0.0.1:8099' + shot.path);
    await page.waitForTimeout(2200);
    if (shot.scroll) {
      await page.mouse.move(WIDTH / 2, HEIGHT / 2);
      await page.mouse.wheel(0, shot.scroll);
      await page.waitForTimeout(700);
    }
    await page.screenshot({ path: path.join(OUT, shot.name + '.png') });
    console.log(shot.name);
  }

  await browser.close();
})();
