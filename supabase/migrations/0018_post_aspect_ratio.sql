-- Posts are now cropped to a chosen format (1:1, 4:5 or 16:9) before upload,
-- like Instagram. Storing the ratio lets the feed reserve the right height
-- immediately instead of measuring the image and jumping once it loads.
-- Existing posts stay null and fall back to the previous fixed 4:5.

alter table public.posts
  add column image_aspect_ratio real;
