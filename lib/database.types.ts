export type MatchStatus = 'scheduled' | 'live' | 'finished';

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  level: number;
  xp: number;
  points: number;
  tips_count: number;
  correct_tips_count: number;
  jokers_remaining: number;
  dark_mode: boolean;
  notifications_enabled: boolean;
  language: string;
  login_streak: number;
  last_login_date: string | null;
  created_at: string;
};

export type League = {
  id: string;
  code: string;
  name: string;
  flag_emoji: string;
  sort_order: number;
};

export type Matchday = {
  id: string;
  league_id: string;
  number: number;
  deadline: string;
};

export type Match = {
  id: string;
  matchday_id: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
};

export type Tip = {
  id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  is_joker: boolean;
  points_earned: number | null;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string | null;
  location: string | null;
  created_at: string;
};

export type PostWithAuthor = Post & {
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url'>;
  like_count: number;
  liked_by_me: boolean;
};

export type Story = {
  id: string;
  user_id: string;
  media_url: string;
  created_at: string;
  expires_at: string;
};

export type Conversation = {
  id: string;
  is_group: boolean;
  title: string | null;
  created_at: string;
};

export type ConversationParticipant = {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type Badge = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
};

export type UserBadge = {
  user_id: string;
  badge_id: string;
  earned_at: string;
};

export type DuelStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export type Duel = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  matchday_id: string;
  status: DuelStatus;
  winner_id: string | null;
  created_at: string;
  responded_at: string | null;
  completed_at: string | null;
};

export type DuelWithDetails = Duel & {
  challenger: Pick<Profile, 'id' | 'username' | 'avatar_url'>;
  opponent: Pick<Profile, 'id' | 'username' | 'avatar_url'>;
  matchday: Matchday & { league: League };
  challenger_points: number;
  opponent_points: number;
};

export type DuelScore = {
  duel_id: string;
  challenger_id: string;
  opponent_id: string;
  challenger_points: number;
  opponent_points: number;
};

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

// Minimal Supabase `Database` generic so the client has table-shaped types
// without depending on the Supabase CLI codegen step.
export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string; username: string }>;
      leagues: Table<League, Partial<League>>;
      matchdays: Table<Matchday, Partial<Matchday>>;
      matches: Table<Match, Partial<Match>>;
      tips: Table<Tip, Partial<Tip> & { user_id: string; match_id: string; home_score: number; away_score: number }>;
      posts: Table<Post, Partial<Post> & { user_id: string }>;
      post_likes: Table<{ post_id: string; user_id: string; created_at: string }, { post_id: string; user_id: string }>;
      post_comments: Table<
        { id: string; post_id: string; user_id: string; content: string; created_at: string },
        { post_id: string; user_id: string; content: string }
      >;
      follows: Table<
        { follower_id: string; following_id: string; created_at: string },
        { follower_id: string; following_id: string }
      >;
      stories: Table<Story, Partial<Story> & { user_id: string; media_url: string }>;
      conversations: Table<Conversation, Partial<Conversation>>;
      conversation_participants: Table<
        ConversationParticipant,
        Partial<ConversationParticipant> & { conversation_id: string; user_id: string }
      >;
      messages: Table<Message, Partial<Message> & { conversation_id: string; sender_id: string; content: string }>;
      badges: Table<Badge, Partial<Badge>>;
      user_badges: Table<UserBadge, Partial<UserBadge> & { user_id: string; badge_id: string }>;
      duels: Table<Duel, { challenger_id: string; opponent_id: string; matchday_id: string }>;
    };
    Views: {
      duel_scores: { Row: DuelScore; Relationships: [] };
    };
    Functions: {
      claim_daily_login: {
        Args: Record<string, never>;
        Returns: { streak: number; reward_xp: number; reward_joker: number; already_claimed: boolean }[];
      };
    };
  };
};
