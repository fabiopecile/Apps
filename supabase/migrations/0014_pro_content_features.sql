-- Two Pro content features:
--  - Story-Archiv: a story marked as a "highlight" gets pushed far into the
--    future (stories are only ever readable while expires_at > now(), per
--    the existing RLS policy) so it never expires.
--  - Mehrere Fotos pro Beitrag: an additional image_urls array, used instead
--    of the single image_url when a Pro user attaches more than one photo.
--    image_url is kept (and still set to the first photo) so every existing
--    query/screen that only knows about image_url keeps working.

alter table public.stories
  add column is_highlight boolean not null default false;

alter table public.posts
  add column image_urls text[];
