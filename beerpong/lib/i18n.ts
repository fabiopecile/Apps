import { useCallback } from 'react';
import { useBeerpongStore } from './store';
import type { Language } from './languages';

export type { Language };
export { LANGUAGES } from './languages';

type Vars = Record<string, string | number>;

/**
 * Every piece of user-facing copy in the app. German is the source language;
 * `t()` falls back to it whenever an English string is missing, so a gap shows
 * up as untranslated text rather than a blank screen.
 */
const STRINGS = {
  // ---------------------------------------------------------------- common
  'common.back': { de: 'Zurück', en: 'Back' },
  'common.cancel': { de: 'Abbrechen', en: 'Cancel' },
  'common.close': { de: 'Schließen', en: 'Close' },
  'common.continue': { de: 'Weiter', en: 'Continue' },
  'common.start': { de: 'Start', en: 'Start' },
  'common.coins': { de: 'Coins', en: 'Coins' },
  'common.wins': { de: 'Siege', en: 'Wins' },
  'common.cups': { de: 'Cups', en: 'Cups' },
  'common.throws': { de: 'Würfe', en: 'Throws' },
  'common.streak': { de: 'Serie', en: 'Streak' },
  'common.player': { de: 'Spieler', en: 'Player' },
  'common.you': { de: 'Du', en: 'You' },
  'common.vs': { de: 'gegen', en: 'vs' },
  'common.soon': { de: 'Bald', en: 'Soon' },
  'share.button': { de: 'Ergebnis teilen', en: 'Share result' },
  'share.footer': { de: 'Gespielt mit der Beerpong App', en: 'Played with the Beerpong app' },
  'tab.camera': { de: 'Kamera', en: 'Camera' },
  'tab.arcade': { de: 'Arcade', en: 'Arcade' },

  // ------------------------------------------------------------ difficulty
  'ai.easy.label': { de: 'Einfach', en: 'Easy' },
  'ai.easy.description': {
    de: 'Lockerer Gegner, viel Spielraum für deine Würfe.',
    en: 'A relaxed opponent — plenty of room for your throws.',
  },
  'ai.medium.label': { de: 'Mittel', en: 'Medium' },
  'ai.medium.description': {
    de: 'Trifft regelmäßig — Fehlwürfe werden bestraft.',
    en: 'Scores regularly — misses get punished.',
  },
  'ai.hard.label': { de: 'Schwer', en: 'Hard' },
  'ai.hard.description': {
    de: 'Räumt dein Rack ab, wenn du zu oft danebenwirfst.',
    en: 'Clears your rack if you miss too often.',
  },

  // ---------------------------------------------------------------- profile
  'profile.open': { de: 'Profil öffnen', en: 'Open profile' },
  'profile.overall': { de: 'Gesamtstatistik', en: 'Overall stats' },
  'profile.totalCups': { de: 'Cups gesamt', en: 'Cups total' },
  'profile.bestStreak': { de: 'Beste Serie', en: 'Best streak' },
  'profile.games': { de: 'Spiele', en: 'Games' },
  'profile.cameraTracker': { de: 'Kamera-Tracker', en: 'Camera tracker' },
  'profile.roundsPlayed': { de: 'Runden gespielt', en: 'Rounds played' },
  'profile.cupsTracked': { de: 'Cups getrackt', en: 'Cups tracked' },
  'profile.arcade': { de: 'Arcade', en: 'Arcade' },
  'profile.totalThrows': { de: 'Würfe gesamt', en: 'Throws total' },
  'profile.accuracy': { de: 'Trefferquote', en: 'Accuracy' },
  'profile.record': { de: 'Bilanz', en: 'Record' },
  'profile.recordValue': { de: '{wins}S / {losses}N', en: '{wins}W / {losses}L' },
  'profile.settings': { de: 'Einstellungen', en: 'Settings' },
  'profile.sound': { de: 'Sound-Effekte', en: 'Sound effects' },
  'profile.haptics': { de: 'Haptisches Feedback', en: 'Haptic feedback' },
  'profile.language': { de: 'Sprache', en: 'Language' },
  'profile.pro': { de: 'Beerpong Pro', en: 'Beerpong Pro' },

  // ------------------------------------------------------------- onboarding
  'onboarding.skip': { de: 'Überspringen', en: 'Skip' },
  'onboarding.start': { de: 'Los geht’s', en: "Let's go" },
  'onboarding.tracker.title': { de: 'Zähl dein echtes Spiel', en: 'Score your real game' },
  'onboarding.tracker.body': {
    de: 'Stell das Handy an den Tisch, gib beiden Teams einen Namen und tippe bei jedem Treffer auf den Bildschirm. Die App führt Cups, Serien und den Sieger.',
    en: 'Stand your phone at the table, name both teams and tap the screen on every hit. The app tracks cups, streaks and the winner.',
  },
  'onboarding.arcade.title': { de: 'Oder wirf selbst', en: 'Or throw yourself' },
  'onboarding.arcade.body': {
    de: 'Im Arcade-Modus wirfst du mit einer Wischbewegung: Die Geschwindigkeit deiner Hand wird zur Geschwindigkeit des Balls, dann fliegt er im Bogen und fällt wieder herunter. Getroffen wird der Becher, in dem er aufkommt — Schwung und Richtung entscheiden, nicht der Zufall.',
    en: 'In arcade mode you throw with a swipe: the speed of your hand becomes the speed of the ball, which arcs up and drops back down. You sink whatever cup it lands in — your throw decides it, not chance.'
  },
  'onboarding.progress.title': { de: 'Alles zählt mit', en: 'Everything counts' },
  'onboarding.progress.body': {
    de: 'Jeder Cup bringt Coins und XP. Damit schaltest du Skins frei, steigst von Division 10 bis 1 auf und holst dir Tagesaufgaben und Erfolge ab.',
    en: 'Every cup earns coins and XP. Spend them on skins, climb from Division 10 to 1, and claim daily tasks and achievements along the way.',
  },

  // ------------------------------------------------------------ pro paywall
  'pro.title': { de: 'Beerpong Pro', en: 'Beerpong Pro' },
  'pro.teaser': {
    de: 'Cup-Erkennung, online gegen andere Tische — in Arbeit',
    en: 'Cup detection, online against other tables — in the works',
  },
  'pro.heroTitle': { de: 'Die Kamera zählt mit', en: 'Let the camera keep score' },
  'pro.heroBody': {
    de: 'Die App erkennt heute schon, wenn ein Becher verschwindet — fragt aber jedes Mal nach. Pro soll ohne Nachfrage auskommen.',
    en: 'The app already spots a cup going missing — but asks every time. Pro is meant to do without the question.',
  },
  'pro.inDevelopment': { de: 'In Entwicklung', en: 'In development' },
  'pro.whatsInside': { de: 'Was geplant ist', en: "What's planned" },
  'pro.feature.detect.title': { de: 'Echte Objekterkennung', en: 'Real object detection' },
  'pro.feature.detect.body': {
    de: 'Cups und Ball werden im Kamerabild erkannt, Treffer zählen sich selbst.',
    en: 'Cups and ball recognised in the camera feed, so hits count themselves.',
  },
  'pro.feature.online.title': {
    de: 'Kamera-Modus gegen Online-Gegner',
    en: 'Camera mode against online opponents',
  },
  'pro.feature.online.body': {
    de: 'Ihr steht an eurem Tisch, die anderen an ihrem — jede Seite trackt ihr eigenes Rack, die App führt einen gemeinsamen Spielstand.',
    en: 'You stand at your table, they stand at theirs — each side tracks its own rack while the app keeps one shared score.',
  },
  'pro.feature.stats.title': { de: 'Tiefe Statistiken', en: 'Deep stats' },
  'pro.feature.stats.body': {
    de: 'Trefferzonen, Formkurve über die Saison und Vergleich mit deinen Freunden.',
    en: 'Hit zones, form over the season and a comparison with your friends.',
  },
  'pro.feature.replay.title': { de: 'Highlight-Clips', en: 'Highlight clips' },
  'pro.feature.replay.body': {
    de: 'Die letzten Sekunden vor einem Treffer automatisch als kurzes Video.',
    en: 'The last few seconds before a hit, saved automatically as a short clip.',
  },
  'pro.feature.sync.title': { de: 'Cloud-Sync', en: 'Cloud sync' },
  'pro.feature.sync.body': {
    de: 'Fortschritt auf mehreren Geräten und echtes Matchmaking im Arcade-Modus.',
    en: 'Progress across devices, plus real matchmaking in arcade mode.',
  },
  'pro.feature.skins.title': { de: 'Pro-Skins', en: 'Pro skins' },
  'pro.feature.skins.body': {
    de: 'Exklusive Bälle und Tische, die es nicht für Coins gibt.',
    en: 'Exclusive balls and tables you cannot buy with coins.',
  },
  'pro.howItWorks': { de: 'Wie das funktionieren soll', en: 'How it is meant to work' },
  'pro.explainDetectTitle': { de: 'Cups automatisch zählen', en: 'Counting cups automatically' },
  'pro.explainOnlineTitle': { de: 'Zwei Tische, ein Spiel', en: 'Two tables, one game' },
  'pro.explainOnlineBody': {
    de: 'Einer eröffnet eine Partie und teilt den Code, die andere Seite tritt bei. Ab da zählt jedes Team nur sein eigenes Rack — der Spielstand wird zwischen den Handys abgeglichen, und wer dran ist, steht auf beiden Bildschirmen. Übertragen werden nur Treffer und Züge, kein Videobild.',
    en: 'One side opens a game and shares the code, the other joins. From then on each team only counts its own rack — the score syncs between the phones and both screens show whose turn it is. Only hits and turns travel over the network, never video.',
  },
  'pro.explainBody': {
    de: 'Heute musst du das Rack einmal von Hand ausrichten, und bei jedem erkannten Becher fragt die App nach. Mit Pro soll ein kleines Bilderkennungsmodell direkt auf dem Handy die Becher selbst finden — dann fallen Ausrichten und Nachfragen weg. Alles bleibt auf dem Gerät, es werden keine Videos hochgeladen.',
    en: 'Today you line the rack up by hand once, and the app asks about every cup it spots. With Pro a small vision model on the phone would find the cups itself — no lining up, no questions. Everything stays on the device; no video is uploaded.',
  },
  'pro.notifyCta': { de: 'Benachrichtige mich', en: 'Notify me' },
  'pro.notifyOn': { de: 'Vorgemerkt ✓', en: 'On the list ✓' },
  'pro.disclaimer': {
    de: 'Pro ist noch nicht kaufbar. Die Vormerkung wird nur lokal auf diesem Gerät gespeichert.',
    en: 'Pro is not purchasable yet. Your reminder is stored locally on this device only.',
  },

  // -------------------------------------------------------------- not found
  'notFound.title': { de: 'Nicht gefunden', en: 'Not found' },
  'notFound.body': { de: 'Diese Seite existiert nicht.', en: 'This page does not exist.' },
  'notFound.link': { de: 'Zurück zum Tracker', en: 'Back to the tracker' },

  // --------------------------------------------------------- pass and play
  'passplay.intro': {
    de: 'Zwei Spieler an einem Handy. Ihr werft abwechselnd — nach jedem Wurf sagt die App, wer dran ist, und ihr gebt das Handy weiter.',
    en: 'Two players, one phone. You throw in turns — after each throw the app says who is up, and you pass the phone along.',
  },
  'passplay.playerN': { de: 'Spieler {n}', en: 'Player {n}' },
  'passplay.throwsUp': { de: 'wirft nach oben', en: 'throws upwards' },
  'passplay.throwsDown': { de: 'wirft nach unten', en: 'throws downwards' },
  'passplay.rule.swipe': {
    de: 'Wischen wie sonst — je schneller die Hand, desto weiter der Wurf.',
    en: 'Swipe as usual — the faster your hand, the further the throw.',
  },
  'passplay.rule.bounce': {
    de: 'Bounce-Wurf: schwerer zu treffen, nimmt dafür zwei Cups.',
    en: 'Bounce shot: harder to land, but takes two cups.',
  },
  'passplay.rule.reRack': {
    de: 'Ein Re-Rack pro Spieler, wenn nur noch wenige Cups stehen.',
    en: 'One re-rack per player once only a few cups are left.',
  },
  'passplay.rule.camera': {
    de: 'Nach jedem Wurf wechselt die Ansicht auf die andere Seite.',
    en: 'After each throw the view swings round to the other side.',
  },
  'passplay.startGame': { de: 'Spiel starten', en: 'Start game' },

  // --------------------------------------------------------- camera tracker
  'tracker.title': { de: 'TRACKER', en: 'TRACKER' },
  'tracker.permission.title': { de: 'Kamera-Zugriff nötig', en: 'Camera access needed' },
  'tracker.permission.body': {
    de: 'Beerpong nutzt die Kamera, um dein Live-Spiel zu tracken. Erlaube den Zugriff, um Treffer per Tap zu zählen.',
    en: 'Beerpong uses the camera to track your live game. Allow access to count hits by tapping.',
  },
  'tracker.permission.cta': { de: 'Kamera erlauben', en: 'Allow camera' },
  'tracker.finished': { de: 'Spiel beendet', en: 'Game over' },
  'tracker.throwingAt': { de: '{shooter} wirft auf {target}', en: '{shooter} is throwing at {target}' },
  // ------------------------------------------------------- cup auto-detect
  'detect.button': { de: 'Auto-Erkennung', en: 'Auto detect' },
  'detect.alignStep': { de: '{step}/2 · Rack von {team}', en: '{step}/2 · {team}’s rack' },
  'detect.alignBody': {
    de: 'Ringe auf die echten Becher legen: ziehen zum Verschieben, zwei Finger zum Vergrößern und Drehen. Steht das Handy an der Längsseite, liegen die Racks quer — dafür ist der 90°-Knopf da.',
    en: 'Put the rings on the real cups: drag to move, two fingers to resize and turn. With the phone at the side of the table the racks lie sideways — that is what the 90° button is for.',
  },
  'detect.turnTip': {
    de: 'Handy quer halten zeigt fast dreimal so viel vom Tisch — dann von der Längsseite filmen.',
    en: 'Turning the phone sideways shows nearly three times as much table — then film from the long side.',
  },
  'detect.nextRack': { de: 'Weiter zum 2. Rack', en: 'On to rack 2' },
  'detect.onlyOne': { de: 'Nur ein Rack', en: 'Just one rack' },
  'detect.start': { de: 'Passt — los', en: 'Looks right — go' },
  'detect.watchingBoth': {
    de: 'Beide Racks im Blick · {left} Becher',
    en: 'Watching both racks · {left} cups',
  },
  'detect.watchingOne': {
    de: 'Ein Rack im Blick · {left} Becher',
    en: 'Watching one rack · {left} cups',
  },
  'detect.recalibrate': { de: 'Neu ausrichten', en: 'Line up again' },
  'detect.stop': { de: 'Beenden', en: 'Stop' },
  'detect.hitTitle': { de: 'Becher weg — Treffer?', en: 'Cup gone — was that a hit?' },
  'detect.hitBody': {
    de: 'Bei {loser} fehlt ein Becher — bestätige, dann geht der Punkt an {scorer}.',
    en: 'A cup is missing from {loser} — confirm and the point goes to {scorer}.',
  },
  'detect.wasAHit': { de: 'Treffer', en: 'Hit' },
  'detect.notAHit': { de: 'War nichts', en: 'False alarm' },
  'detect.disturbed': {
    de: 'Rack von {team} komplett verändert — Kamera bewegt oder Licht gewechselt. Bei Fehlern neu ausrichten.',
    en: '{team}’s rack changed all at once — camera moved or the light did. Line up again if it starts guessing.',
  },
  'detect.noFrame': {
    de: 'Kein Kamerabild — Zugriff erlaubt und Kamera frei?',
    en: 'No camera image — is access allowed and the lens clear?',
  },
  'detect.unsupported': {
    de: 'Die Auto-Erkennung läuft nur in der Web-Version. In der installierten App fehlt der Zugriff auf einzelne Kamerabilder.',
    en: 'Auto detection only runs in the web version. The installed app has no access to individual camera frames.',
  },

  'tracker.openOnline': {
    de: 'Online gegen anderen Tisch spielen (Pro)',
    en: 'Play online against another table (Pro)',
  },
  'tracker.openTournament': { de: 'Turnier öffnen', en: 'Open tournament' },
  'tracker.openHouseRules': { de: 'House Rules öffnen', en: 'Open house rules' },
  'tracker.tapHint': {
    de: 'Tippe irgendwo, wenn {shooter} trifft',
    en: 'Tap anywhere when {shooter} scores',
  },
  'tracker.miss': { de: 'Fehlwurf', en: 'Miss' },
  'tracker.team': { de: 'Team', en: 'Team' },
  'tracker.newGame': { de: 'Neues Spiel', en: 'New game' },
  'tracker.rematch': { de: 'Revanche', en: 'Rematch' },
  'tracker.hitsPercent': { de: 'Treffer · {percent}%', en: 'Hits · {percent}%' },
  'tracker.bestStreak': { de: 'Beste Serie {value}', en: 'Best streak {value}' },
  'tracker.throwsMeta': {
    de: '{hits}/{throws} Würfe · Serie {streak}',
    en: '{hits}/{throws} throws · streak {streak}',
  },

  // ----------------------------------------------------------- house rules
  'rules.reRacks': {
    de: 'Cups dürfen bis zu zweimal neu aufgestellt werden.',
    en: 'Cups may be re-racked up to twice.',
  },
  'rules.island': {
    de: 'Letzter Cup ohne Nachbarn zählt doppelt.',
    en: 'A lone cup with no neighbours counts double.',
  },
  'rules.redemption': {
    de: 'Verlierendes Team bekommt einen letzten Wurf.',
    en: 'The losing team gets one last throw.',
  },

  // ------------------------------------------------------------- tournament
  'tournament.title': { de: 'Turnier', en: 'Tournament' },
  'tournament.intro': {
    de: 'Trage {min} bis {max} Teams ein. Die App erstellt den Turnierbaum, ihr spielt am echten Tisch, und der Sieger jedes Spiels rückt automatisch weiter.',
    en: 'Enter {min} to {max} teams. The app builds the bracket, you play at the real table, and each winner advances automatically.',
  },
  'tournament.teams': { de: 'Teams', en: 'Teams' },
  'tournament.addTeam': { de: 'Team hinzufügen', en: 'Add team' },
  'tournament.start': {
    de: 'Turnier mit {count} Teams starten',
    en: 'Start tournament with {count} teams',
  },
  'tournament.needMore': { de: 'Mindestens {min} Teams', en: 'At least {min} teams' },
  'tournament.champion': { de: 'Turniersieger', en: 'Tournament winner' },
  'tournament.newTournament': { de: 'Neues Turnier', en: 'New tournament' },
  'tournament.upNext': { de: 'Als Nächstes', en: 'Up next' },
  'tournament.playInTracker': { de: 'Im Tracker spielen', en: 'Play in the tracker' },
  'tournament.open': { de: 'offen', en: 'open' },
  'tournament.wins': { de: 'gewinnt', en: 'wins' },
  'tournament.round.final': { de: 'Finale', en: 'Final' },
  'tournament.round.semi': { de: 'Halbfinale', en: 'Semi-final' },
  'tournament.round.quarter': { de: 'Viertelfinale', en: 'Quarter-final' },
  'tournament.round.n': { de: 'Runde {round}', en: 'Round {round}' },

  // ------------------------------------------------------------- arcade hub
  'hub.title': { de: 'ARCADE', en: 'ARCADE' },
  'hub.careerLevel': { de: 'Career Level {level}', en: 'Career level {level}' },
  'hub.modes': { de: 'Spielmodi', en: 'Game modes' },
  'hub.offline.title': { de: 'Offline vs. KI', en: 'Offline vs. AI' },
  'hub.offline.subtitle': {
    de: 'Zuletzt: {last} · Einfach, Mittel oder Schwer',
    en: 'Last: {last} · Easy, Medium or Hard',
  },
  'hub.passplay.title': { de: 'Pass & Play', en: 'Pass & Play' },
  'hub.passplay.subtitle': {
    de: 'Zwei Spieler, ein Handy — abwechselnd werfen',
    en: 'Two players, one phone — throw in turns',
  },
  'hub.rivals.title': { de: 'Division Rivals', en: 'Division Rivals' },
  'hub.rivals.subtitle': {
    de: '{division} · {wins}/{target} Siege bis Aufstieg',
    en: '{division} · {wins}/{target} wins to promotion',
  },
  'hub.weekend.title': { de: 'Weekend League', en: 'Weekend League' },
  'hub.weekend.running': {
    de: 'Lauf läuft · {played}/{matches} Spiele · {wins} Siege',
    en: 'Run in progress · {played}/{matches} games · {wins} wins',
  },
  'hub.weekend.idle': {
    de: '{matches} Spiele, vier Belohnungsstufen',
    en: '{matches} games, four reward tiers',
  },
  'hub.weekend.locked': {
    de: 'Ab Division {division} freigeschaltet',
    en: 'Unlocks at Division {division}',
  },
  'hub.progress': { de: 'Fortschritt', en: 'Progress' },
  'hub.challenges.title': { de: 'Aufgaben & Erfolge', en: 'Challenges & achievements' },
  'hub.challenges.subtitle': {
    de: 'Tagesaufgaben, Saison-Stufen und Erfolge',
    en: 'Daily tasks, season tiers and achievements',
  },
  'hub.challenges.ready1': { de: '1 Belohnung abholbereit', en: '1 reward ready to claim' },
  'hub.challenges.readyN': { de: '{count} Belohnungen abholbereit', en: '{count} rewards ready to claim' },
  'hub.collection': { de: 'Sammlung', en: 'Collection' },
  'hub.skins.title': { de: 'Skins', en: 'Skins' },
  'hub.skins.subtitle': { de: 'Bälle und Tische freischalten', en: 'Unlock balls and tables' },
  'hub.stat.rivalsWins': { de: 'Rivals-Siege', en: 'Rivals wins' },
  'hub.stat.bestDivision': { de: 'Beste Division', en: 'Best division' },
  'hub.stat.weekendBest': { de: 'WL-Bestwert', en: 'WL best' },

  // ----------------------------------------------------------- match screen
  'match.badge.ai': { de: 'KI · {difficulty}', en: 'AI · {difficulty}' },
  'match.yourTurn': {
    de: 'Dein Wurf — schwungvoll nach oben wischen',
    en: 'Your throw — swipe up, and mean it',
  },
  'match.opponentAiming': { de: '{name} zielt …', en: '{name} is aiming …' },
  'match.weekendHeader': {
    de: 'Spiel {played}/{matches} · {wins} Siege',
    en: 'Game {played}/{matches} · {wins} wins',
  },
  'match.bounce': { de: 'Bounce ×2', en: 'Bounce ×2' },
  'match.bounceArmed': {
    de: 'Bounce-Wurf scharf — schwerer, aber zwei Cups',
    en: 'Bounce shot armed — harder, but takes two cups',
  },
  'match.reRack': { de: 'Re-Rack {left}', en: 'Re-rack {left}' },
  'match.rotateTitle': { de: 'Handy hochkant halten', en: 'Hold the phone upright' },
  'match.rotateBody': {
    de: 'Arcade wird im Hochformat gespielt — der Tisch ist lang, und nach oben gewischt wird auch. Das Spiel läuft weiter, sobald du drehst.',
    en: 'Arcade is played upright — the table is long, and so is the swipe. The game picks up again as soon as you turn back.',
  },
  'match.win': { de: 'SIEG!', en: 'WIN!' },
  'match.lose': { de: 'NIEDERLAGE', en: 'DEFEAT' },
  'match.teamWins': { de: '{team} gewinnt!', en: '{team} wins!' },
  'match.passplayClears': { de: '{team} räumt ab!', en: '{team} clears the table!' },
  'match.rivalsNote': {
    de: '{wins}/{target} Siege bis zum Aufstieg · +{coins} Coins',
    en: '{wins}/{target} wins to promotion · +{coins} coins',
  },
  'match.promoted': { de: 'AUFSTIEG!', en: 'PROMOTED!' },
  'match.relegated': { de: 'ABSTIEG', en: 'RELEGATED' },
  'match.promotedSub': {
    de: 'Willkommen in {division} · +{coins} Coins',
    en: 'Welcome to {division} · +{coins} coins',
  },
  'match.relegatedSub': {
    de: 'Zurück in {division} — hol sie dir wieder.',
    en: 'Back in {division} — go win it back.',
  },
  'match.weekendDone': {
    de: 'Lauf beendet: {wins}/{matches} Siege',
    en: 'Run finished: {wins}/{matches} wins',
  },
  'match.weekendNote': {
    de: 'Spiel {played}/{matches} · {wins} Siege · +{coins} Coins',
    en: 'Game {played}/{matches} · {wins} wins · +{coins} coins',
  },
  'match.weekendCelebration': {
    de: '{wins}/{matches} Siege · Stufe {tier} · +{coins} Coins',
    en: '{wins}/{matches} wins · {tier} tier · +{coins} coins',
  },
  'match.offlineWin': { de: '+75 Coins · +Career XP', en: '+75 coins · +career XP' },
  'match.offlineLose': { de: '+20 Coins', en: '+20 coins' },
  'match.shareWin': { de: 'Sieg!', en: 'Win!' },
  'match.shareLose': { de: 'Knapp verloren', en: 'Close loss' },
  'match.shareSubline': { de: '{badge} · gegen {name}', en: '{badge} · vs {name}' },
  'match.handOverTitle': { de: '{team} ist dran', en: "{team}'s turn" },
  'match.handOverBody': {
    de: 'Handy weitergeben, dann tippen.',
    en: 'Pass the phone, then tap.',
  },
  'match.handOverReady': { de: 'Bereit', en: 'Ready' },

  // --------------------------------------------------------- offline screen
  'offline.title': { de: 'Offline', en: 'Offline' },
  'offline.intro': {
    de: 'Spiel ohne Verbindung gegen die KI. Die Schwierigkeit bestimmt, wie sicher dein Gegner trifft — und wie viel Spielraum deine eigenen Würfe haben.',
    en: 'Play the AI with no connection. The difficulty sets how reliably your opponent scores — and how much room your own throws get.',
  },
  'offline.lastPlayed': { de: 'Zuletzt gespielt', en: 'Last played' },
  'offline.meter.opponent': { de: 'Gegner trifft', en: 'Opponent scores' },
  'offline.meter.you': { de: 'Deine Chance', en: 'Your chance' },
  'offline.startWith': {
    de: 'Spiel starten · +{coins} Coins bei Sieg',
    en: 'Start game · +{coins} coins on a win',
  },
  'offline.gallery': { de: 'Gegner-Galerie', en: 'Opponent gallery' },
  'offline.defeated': { de: 'Besiegt', en: 'Beaten' },

  // ---------------------------------------------------------- rivals screen
  'rivals.title': { de: 'Division Rivals', en: 'Division Rivals' },
  'rivals.progress': {
    de: '{wins}/{target} Siege bis zum Aufstieg · {losses} Niederlagen bis zum Abstieg',
    en: '{wins}/{target} wins to promotion · {losses} losses to relegation',
  },
  'rivals.losses': { de: 'Niederlagen', en: 'Losses' },
  'rivals.bestDiv': { de: 'Beste Div.', en: 'Best div.' },
  'rivals.findOpponent': { de: 'Gegner suchen', en: 'Find opponent' },
  'rivals.matchmakingNote': {
    de: 'Gegner werden aktuell lokal simuliert — Skill passend zu deiner Division.',
    en: 'Opponents are simulated locally for now — skill matched to your division.',
  },
  'rivals.ladder': { de: 'Leiter', en: 'Ladder' },
  'rivals.ladderMeta': {
    de: '{wins} Siege zum Aufstieg · +{coins} Coins pro Sieg',
    en: '{wins} wins to promotion · +{coins} coins per win',
  },
  'rivals.here': { de: 'Hier', en: 'Here' },

  // --------------------------------------------------------- weekend league
  'weekend.title': { de: 'Weekend League', en: 'Weekend League' },
  'weekend.locked.title': { de: 'Noch gesperrt', en: 'Still locked' },
  'weekend.locked.body': {
    de: 'Die Weekend League öffnet ab {required}. Du stehst aktuell in {current}.',
    en: 'The Weekend League opens at {required}. You are currently in {current}.',
  },
  'weekend.locked.cta': { de: 'Zu Division Rivals', en: 'Go to Division Rivals' },
  'weekend.runActive': { de: 'Lauf läuft', en: 'Run in progress' },
  'weekend.runNew': { de: 'Neuer Lauf', en: 'New run' },
  'weekend.runSubtitle': {
    de: '{matches} Spiele am Stück — je mehr Siege, desto besser die Belohnungsstufe.',
    en: '{matches} games in a row — the more wins, the better the reward tier.',
  },
  'weekend.remaining': { de: 'Offen', en: 'Left' },
  'weekend.tier': { de: 'Stufe', en: 'Tier' },
  'weekend.nextMatch': { de: 'Nächstes Spiel', en: 'Next game' },
  'weekend.abortRun': { de: 'Lauf abbrechen', en: 'Abandon run' },
  'weekend.startRun': { de: 'Lauf starten', en: 'Start run' },
  'weekend.rewards': { de: 'Belohnungen', en: 'Rewards' },
  'weekend.tierFrom': { de: 'ab {wins} Siegen', en: 'from {wins} wins' },
  'weekend.bestRun': { de: 'Bester Lauf', en: 'Best run' },
  'weekend.runs': { de: 'Läufe', en: 'Runs' },

  // -------------------------------------------------------------- divisions
  'division.name': { de: 'Division {id} · {rank}', en: 'Division {id} · {rank}' },
  'division.short': { de: 'Division {id}', en: 'Division {id}' },
  'division.rank.rookie': { de: 'Rookie', en: 'Rookie' },
  'division.rank.amateur': { de: 'Amateur', en: 'Amateur' },
  'division.rank.challenger': { de: 'Challenger', en: 'Challenger' },
  'division.rank.contender': { de: 'Contender', en: 'Contender' },
  'division.rank.pro': { de: 'Pro', en: 'Pro' },
  'division.rank.veteran': { de: 'Veteran', en: 'Veteran' },
  'division.rank.elite': { de: 'Elite', en: 'Elite' },
  'division.rank.master': { de: 'Master', en: 'Master' },
  'division.rank.legend': { de: 'Legende', en: 'Legend' },
  'division.rank.champion': { de: 'Champion', en: 'Champion' },

  'weekend.tier.elite': { de: 'Elite', en: 'Elite' },
  'weekend.tier.gold': { de: 'Gold', en: 'Gold' },
  'weekend.tier.silver': { de: 'Silber', en: 'Silver' },
  'weekend.tier.bronze': { de: 'Bronze', en: 'Bronze' },

  // ----------------------------------------------------------- skins screen
  'skins.title': { de: 'Skins', en: 'Skins' },
  'skins.balls': { de: 'Bälle', en: 'Balls' },
  'skins.tables': { de: 'Tische', en: 'Tables' },
  'skins.active': { de: 'Aktiv', en: 'Active' },
  'skins.equip': { de: 'Ausrüsten', en: 'Equip' },
  'skins.buy': { de: '{cost} Coins', en: '{cost} coins' },

  'skin.ball-classic': { de: 'Der Standardball. Immer verfügbar.', en: 'The default ball. Always available.' },
  'skin.ball-neon': { de: 'Leuchtet in sattem Neongrün.', en: 'Glows in deep neon green.' },
  'skin.ball-inferno': { de: 'Feuriger Trail bei jedem Wurf.', en: 'A fiery trail on every throw.' },
  'skin.ball-cryo': { de: 'Eiskalte Flugbahn.', en: 'An ice-cold flight path.' },
  'skin.ball-gold': { de: 'Für echte Liga-Champions.', en: 'For real league champions.' },
  'skin.table-classic': { de: 'Der Standardtisch.', en: 'The default table.' },
  'skin.table-arena': { de: 'eSport-Arena-Optik mit Rasterlinien.', en: 'eSport arena look with grid lines.' },
  'skin.table-midnight': { de: 'Tiefviolette Club-Atmosphäre.', en: 'Deep purple club atmosphere.' },
  'skin.table-champion': { de: 'Das Finale wartet.', en: 'The final is waiting.' },

  // ------------------------------------------------------ challenges screen
  'challenges.title': { de: 'Aufgaben', en: 'Challenges' },
  'challenges.today': { de: 'Heute', en: 'Today' },
  'challenges.claim': { de: 'Einsammeln', en: 'Claim' },
  'challenges.claimed': { de: 'Abgeholt', en: 'Claimed' },
  'challenges.season': { de: 'Saison', en: 'Season' },
  'challenges.seasonLevel': { de: 'Stufe {reached}/{total}', en: 'Tier {reached}/{total}' },
  'challenges.xp': { de: '{xp} XP', en: '{xp} XP' },
  'challenges.seasonNext': {
    de: 'Noch {xp} XP bis Stufe {level}',
    en: '{xp} XP to go until tier {level}',
  },
  'challenges.seasonDone': { de: 'Alle Stufen erreicht.', en: 'All tiers reached.' },
  'challenges.achievements': { de: 'Erfolge', en: 'Achievements' },

  // ------------------------------------------------------- daily challenges
  'daily.cups15': { de: '15 Cups versenken', en: 'Sink 15 cups' },
  'daily.cups30': { de: '30 Cups versenken', en: 'Sink 30 cups' },
  'daily.throws40': { de: '40 Würfe machen', en: 'Take 40 throws' },
  'daily.wins2': { de: '2 Spiele gewinnen', en: 'Win 2 games' },
  'daily.wins4': { de: '4 Spiele gewinnen', en: 'Win 4 games' },
  'daily.bounce3': { de: '3 Bounce-Shots treffen', en: 'Land 3 bounce shots' },
  'daily.bounce1': { de: 'Einen Bounce-Shot treffen', en: 'Land a bounce shot' },
  'daily.tracker10': { de: '10 Cups im Tracker zählen', en: 'Count 10 cups in the tracker' },

  // ----------------------------------------------------------- achievements
  'achv.first-blood.title': { de: 'Erster Cup', en: 'First Cup' },
  'achv.first-blood.description': { de: 'Versenke deinen ersten Cup.', en: 'Sink your first cup.' },
  'achv.century.title': { de: 'Hundert Cups', en: 'Century' },
  'achv.century.description': { de: 'Versenke insgesamt 100 Cups.', en: 'Sink 100 cups in total.' },
  'achv.streak-5.title': { de: 'Heiße Serie', en: 'Hot Streak' },
  'achv.streak-5.description': { de: 'Triff fünf Mal in Folge.', en: 'Hit five times in a row.' },
  'achv.wins-10.title': { de: 'Zehn Siege', en: 'Ten Wins' },
  'achv.wins-10.description': { de: 'Gewinne 10 Arcade-Spiele.', en: 'Win 10 arcade games.' },
  'achv.division-5.title': { de: 'Aufsteiger', en: 'Climber' },
  'achv.division-5.description': { de: 'Erreiche Division 5.', en: 'Reach Division 5.' },
  'achv.division-1.title': { de: 'Champion', en: 'Champion' },
  'achv.division-1.description': { de: 'Erreiche Division 1.', en: 'Reach Division 1.' },
  'achv.weekend-6.title': { de: 'Gold-Wochenende', en: 'Golden Weekend' },
  'achv.weekend-6.description': {
    de: 'Hol 6 Siege in einer Weekend League.',
    en: 'Take 6 wins in one Weekend League.',
  },
  'achv.collector.title': { de: 'Sammler', en: 'Collector' },
  'achv.collector.description': { de: 'Besitze 5 Skins.', en: 'Own 5 skins.' },
  'achv.host.title': { de: 'Gastgeber', en: 'Host' },
  'achv.host.description': { de: 'Tracke 5 echte Spiele.', en: 'Track 5 real games.' },
} satisfies Record<string, Record<Language, string>>;

export type TranslationKey = keyof typeof STRINGS;

export function translate(language: Language, key: TranslationKey, vars?: Vars): string {
  const entry = STRINGS[key] as Record<Language, string> | undefined;
  let out = entry?.[language] ?? entry?.de ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      out = out.split(`{${name}}`).join(String(value));
    }
  }
  return out;
}

/** `const t = useT();` then `t('common.back')` — re-renders on a language switch. */
export function useT() {
  const language = useBeerpongStore((s) => s.language);
  return useCallback(
    (key: TranslationKey, vars?: Vars) => translate(language, key, vars),
    [language]
  );
}

export function useLanguage() {
  return useBeerpongStore((s) => s.language);
}

/** "Division 6 · Pro" — the number is fixed, the rank name is translated. */
export function divisionName(
  language: Language,
  division: { id: number; rankKey: TranslationKey }
): string {
  return translate(language, 'division.name', {
    id: division.id,
    rank: translate(language, division.rankKey),
  });
}
