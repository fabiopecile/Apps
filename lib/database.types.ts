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
  referral_code: string;
  push_token: string | null;
  push_token_updated_at: string | null;
  is_admin: boolean;
  is_pro: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  reminder_hour_utc: number | null;
  login_streak: number;
  last_login_date: string | null;
  last_post_xp_date: string | null;
  coins: number;
  booster_charges: number;
  equipped_title: string | null;
  equipped_frame_color: string | null;
  last_wheel_spin_date: string | null;
  onboarding_done: boolean;
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
  external_id: string | null;
};

export type JokerType = 'risk' | 'boost' | 'safe';

export type Tip = {
  id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  is_joker: boolean;
  joker_type: JokerType | null;
  booster_applied: boolean;
  points_earned: number | null;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  image_url: string | null;
  image_urls: string[] | null;
  image_aspect_ratio: number | null;
  caption: string | null;
  location: string | null;
  created_at: string;
};

export type PostWithAuthor = Post & {
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'equipped_frame_color'>;
  like_count: number;
  liked_by_me: boolean;
};

export type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type PostCommentWithAuthor = PostComment & {
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'equipped_frame_color'>;
};

export type Story = {
  id: string;
  user_id: string;
  media_url: string;
  media_aspect_ratio: number | null;
  location: string | null;
  is_highlight: boolean;
  created_at: string;
  expires_at: string;
};

export type PrivateLeague = {
  id: string;
  name: string;
  code: string;
  created_by: string;
  created_at: string;
};

export type PrivateLeagueMember = {
  league_id: string;
  user_id: string;
  joined_at: string;
};

export type Conversation = {
  id: string;
  is_group: boolean;
  title: string | null;
  created_by: string | null;
  created_at: string;
};

export type ConversationParticipant = {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  is_admin: boolean;
};

export type ConversationMember = ConversationParticipant & {
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'equipped_frame_color'>;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  duel_id: string | null;
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

export type UserTitle = {
  user_id: string;
  title: string;
  earned_at: string;
};

export type DuelStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';
export type DuelType = 'tips' | 'xp' | 'streak';

export type Duel = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  matchday_id: string;
  duel_type: DuelType;
  status: DuelStatus;
  winner_id: string | null;
  challenger_xp_start: number | null;
  opponent_xp_start: number | null;
  created_at: string;
  responded_at: string | null;
  completed_at: string | null;
};

export type DuelWithDetails = Duel & {
  challenger: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'equipped_frame_color'>;
  opponent: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'equipped_frame_color'>;
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

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export type FriendRequest = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: FriendRequestStatus;
  created_at: string;
  responded_at: string | null;
};

export type FriendRequestWithProfiles = FriendRequest & {
  sender: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'equipped_frame_color'>;
  recipient: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'equipped_frame_color'>;
};

export type WheelPrizeType = 'xp' | 'joker' | 'coins' | 'booster' | 'title';

export type Referral = {
  id: string;
  referrer_id: string;
  referred_id: string;
  created_at: string;
};

export type NotificationLog = {
  id: string;
  user_id: string;
  type: string;
  ref_key: string;
  sent_at: string;
};

export type ShopItemKind = 'frame' | 'title';

export type ShopItem = {
  key: string;
  kind: ShopItemKind;
  label: string;
  price: number;
  value: string;
  sort_order: number;
};

export type OwnedShopItem = {
  user_id: string;
  item_key: string;
  purchased_at: string;
};

export type CoinPackage = {
  key: string;
  coins: number;
  bonus_coins: number;
  price_cents: number;
  currency: string;
  label: string;
  sort_order: number;
  active: boolean;
};

export type CoinPurchase = {
  id: string;
  user_id: string;
  package_key: string;
  coins_credited: number;
  price_cents: number;
  provider: 'stripe' | 'apple' | 'google';
  provider_ref: string;
  created_at: string;
};

export type ReportTargetType = 'post' | 'story' | 'comment' | 'user';

export type Report = {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  resolved: boolean;
  created_at: string;
};

export type Block = {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

export type WheelSpinResult = {
  prize_index: number;
  prize_type: WheelPrizeType;
  prize_label: string;
  prize_value: number;
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
      tips: Table<
        Tip,
        Partial<Tip> & { user_id: string; match_id: string; home_score: number; away_score: number }
      >;
      posts: Table<Post, Partial<Post> & { user_id: string }>;
      post_likes: Table<{ post_id: string; user_id: string; created_at: string }, { post_id: string; user_id: string }>;
      post_comments: Table<PostComment, { post_id: string; user_id: string; content: string }>;
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
      messages: Table<
        Message,
        Partial<Message> & { conversation_id: string; sender_id: string; content: string }
      >;
      badges: Table<Badge, Partial<Badge>>;
      user_badges: Table<UserBadge, Partial<UserBadge> & { user_id: string; badge_id: string }>;
      user_titles: Table<UserTitle, { user_id: string; title: string }>;
      duels: Table<
        Duel,
        Partial<Duel> & { challenger_id: string; opponent_id: string; matchday_id: string }
      >;
      friend_requests: Table<FriendRequest, { sender_id: string; recipient_id: string }>;
      referrals: Table<Referral, { referrer_id: string; referred_id: string }>;
      notification_log: Table<NotificationLog, { user_id: string; type: string; ref_key: string }>;
      private_leagues: Table<PrivateLeague, { name: string; code: string; created_by: string }>;
      private_league_members: Table<PrivateLeagueMember, { league_id: string; user_id: string }>;
      shop_items: Table<ShopItem, ShopItem>;
      owned_shop_items: Table<OwnedShopItem, { user_id: string; item_key: string }>;
      reports: Table<
        Report,
        { reporter_id: string; target_type: ReportTargetType; target_id: string; reason: string }
      >;
      blocks: Table<Block, { blocker_id: string; blocked_id: string }>;
      coin_packages: Table<CoinPackage, CoinPackage>;
      coin_purchases: Table<CoinPurchase, Omit<CoinPurchase, 'id' | 'created_at'>>;
    };
    Views: {
      duel_scores: { Row: DuelScore; Relationships: [] };
    };
    Functions: {
      claim_daily_login: {
        Args: Record<string, never>;
        Returns: { streak: number; reward_xp: number; reward_joker: number; already_claimed: boolean }[];
      };
      spin_wheel: {
        Args: Record<string, never>;
        Returns: WheelSpinResult[];
      };
      create_private_league: {
        Args: { p_name: string };
        Returns: PrivateLeague;
      };
      join_private_league: {
        Args: { p_code: string };
        Returns: PrivateLeague;
      };
      create_direct_conversation: {
        Args: { p_other_user_id: string };
        Returns: string;
      };
      create_group_conversation: {
        Args: { p_title: string; p_member_ids: string[] };
        Returns: string;
      };
      add_group_member: {
        Args: { p_conversation_id: string; p_user_id: string };
        Returns: undefined;
      };
      set_group_admin: {
        Args: { p_conversation_id: string; p_user_id: string; p_is_admin: boolean };
        Returns: undefined;
      };
      is_conversation_admin: {
        Args: { p_conversation_id: string };
        Returns: boolean;
      };
      buy_shop_item: {
        Args: { p_key: string };
        Returns: Profile;
      };
      equip_shop_item: {
        Args: { p_key: string };
        Returns: Profile;
      };
      delete_own_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      purge_expired_stories: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
  };
};
