-- Indexes for the lookups the app does on every screen but that no index
-- covered. All of these are fast on a small table and stop being fast at a
-- few thousand rows, so they belong in before real traffic arrives, not after.

-- post_comments is read by post_id every time the comment sheet opens.
-- Its primary key is on id, so the post_id lookup was a sequential scan.
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

-- post_likes has a primary key on (post_id, user_id), which serves lookups by
-- post_id but not the "which posts did I like" direction.
create index if not exists post_likes_user_idx on public.post_likes (user_id);

-- follows likewise: the primary key (follower_id, following_id) covers
-- "who do I follow" but not "who follows me", which the profile screen and
-- the friends ranking both need.
create index if not exists follows_following_idx on public.follows (following_id);

-- The feed reads unexpired stories, and purge_expired_stories() deletes by
-- the same column.
create index if not exists stories_expires_idx on public.stories (expires_at);
create index if not exists stories_user_idx on public.stories (user_id, created_at);

-- Every screen that lists someone's posts filters by author.
create index if not exists posts_user_idx on public.posts (user_id, created_at desc);

-- The chat list resolves a user's conversations through this table.
create index if not exists conversation_participants_user_idx
  on public.conversation_participants (user_id);

-- The reminder job looks up who has already been notified for a given round.
create index if not exists notification_log_user_type_idx
  on public.notification_log (user_id, type, ref_key);
