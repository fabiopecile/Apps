-- Storage bucket for post images (public read, owner-only write).
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "post images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "users can upload their own post images"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can update their own post images"
  on storage.objects for update
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can delete their own post images"
  on storage.objects for delete
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
