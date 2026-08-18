export type Language = 'de' | 'en';

const dictionaries = {
  de: {
    'tabs.feed': 'Feed',
    'tabs.tipps': 'Tipps',
    'tabs.chat': 'Chat',
    'tabs.ranking': 'Ranking',
    'tabs.profil': 'Profil',

    'auth.loginTagline': 'Tippen. Posten. Gewinnen.',
    'auth.signupTagline': 'Erstelle dein Konto',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.passwordHint': 'Passwort (min. 6 Zeichen)',
    'auth.username': 'Benutzername',
    'auth.referralCode': 'Einladungscode (optional)',
    'auth.login': 'Log In',
    'auth.signup': 'Sign Up',
    'auth.noAccount': 'Noch kein Konto?',
    'auth.hasAccount': 'Schon ein Konto?',
    'auth.confirmEmail': 'Fast geschafft! Bestätige deine E-Mail-Adresse, um dich einzuloggen.',

    'feed.addPost': '+ Beitrag hinzufügen (+50 XP)',
    'feed.emptyTitle': 'Noch keine Beiträge',
    'feed.emptySubtitle': "Sei der Erste und teile einen Beitrag aus dem Stadion – dafür gibt's +50 XP.",

    'profil.tabPosts': 'BEITRÄGE',
    'profil.tabStats': 'STATISTIK',
    'profil.tabBadges': 'BADGES',
    'profil.darkMode': 'Dark Mode',
    'profil.language': 'Sprache',
    'profil.notifications': 'Benachrichtigungen',
    'profil.privacy': 'Datenschutz',
    'profil.signOut': 'Abmelden',
    'profil.statTipps': 'Tipps',
    'profil.statQuote': 'Quote',
    'profil.statPoints': 'Punkte',
    'profil.statCoins': 'Coins',
    'profil.tippsAbgegeben': 'Tipps abgegeben',
    'profil.richtigeTipps': 'Richtige Tipps',
    'profil.trefferquote': 'Trefferquote',
    'profil.gesamtpunkte': 'Gesamtpunkte',
    'profil.level': 'Level',
    'profil.noBadges': 'Noch keine Badges verfügbar',
    'profil.noPosts': 'Noch keine Beiträge',

    'invite.title': 'Freunde einladen',
    'invite.subtitle': 'Für jeden Freund, der sich mit deinem Code registriert, bekommst du +{xp} XP und +{joker} Joker.',
    'invite.codeLabel': 'Dein Code',
    'invite.share': 'Code teilen',
    'invite.countOne': 'Freund eingeladen',
    'invite.countMany': 'Freunde eingeladen',

    'language.title': 'Sprache wählen',
    'language.de': 'Deutsch',
    'language.en': 'English',
  },
  en: {
    'tabs.feed': 'Feed',
    'tabs.tipps': 'Picks',
    'tabs.chat': 'Chat',
    'tabs.ranking': 'Ranking',
    'tabs.profil': 'Profile',

    'auth.loginTagline': 'Predict. Post. Win.',
    'auth.signupTagline': 'Create your account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.passwordHint': 'Password (min. 6 characters)',
    'auth.username': 'Username',
    'auth.referralCode': 'Invite code (optional)',
    'auth.login': 'Log In',
    'auth.signup': 'Sign Up',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.confirmEmail': 'Almost there! Confirm your email address to log in.',

    'feed.addPost': '+ Add post (+50 XP)',
    'feed.emptyTitle': 'No posts yet',
    'feed.emptySubtitle': "Be the first to share a post from the stadium – you'll get +50 XP.",

    'profil.tabPosts': 'POSTS',
    'profil.tabStats': 'STATS',
    'profil.tabBadges': 'BADGES',
    'profil.darkMode': 'Dark Mode',
    'profil.language': 'Language',
    'profil.notifications': 'Notifications',
    'profil.privacy': 'Privacy',
    'profil.signOut': 'Sign Out',
    'profil.statTipps': 'Picks',
    'profil.statQuote': 'Accuracy',
    'profil.statPoints': 'Points',
    'profil.statCoins': 'Coins',
    'profil.tippsAbgegeben': 'Picks made',
    'profil.richtigeTipps': 'Correct picks',
    'profil.trefferquote': 'Accuracy',
    'profil.gesamtpunkte': 'Total points',
    'profil.level': 'Level',
    'profil.noBadges': 'No badges available yet',
    'profil.noPosts': 'No posts yet',

    'invite.title': 'Invite Friends',
    'invite.subtitle': "For every friend who signs up with your code, you'll get +{xp} XP and +{joker} Joker.",
    'invite.codeLabel': 'Your code',
    'invite.share': 'Share code',
    'invite.countOne': 'friend invited',
    'invite.countMany': 'friends invited',

    'language.title': 'Choose language',
    'language.de': 'Deutsch',
    'language.en': 'English',
  },
} satisfies Record<Language, Record<string, string>>;

export type TranslationKey = keyof (typeof dictionaries)['de'];

export function translate(language: string, key: TranslationKey, vars?: Record<string, string | number>): string {
  const dict = dictionaries[language === 'en' ? 'en' : 'de'];
  let text = dict[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(`{${name}}`, String(value));
    }
  }
  return text;
}
