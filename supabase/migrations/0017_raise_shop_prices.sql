-- Raise coin-shop prices so earning enough purely from the (roughly 1-in-12,
-- once-daily) Glücksrad coin prize takes a long time - creating headroom for
-- a future "buy coins with real money" option.

update public.shop_items set price = 200 where key = 'frame_blue';
update public.shop_items set price = 200 where key = 'frame_green';
update public.shop_items set price = 300 where key = 'frame_purple';
update public.shop_items set price = 600 where key = 'frame_gold';
update public.shop_items set price = 250 where key = 'title_experte';
update public.shop_items set price = 350 where key = 'title_torjaeger';
update public.shop_items set price = 500 where key = 'title_legende';
