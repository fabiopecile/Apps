-- Stories get their own optional location (shown on the story itself,
-- separate from a post's location). Posting a Beitrag no longer implicitly
-- creates a Story — they're independent actions now.
alter table public.stories
  add column location text;
