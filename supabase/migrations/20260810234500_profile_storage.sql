insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true) 
on conflict (id) do nothing;

create policy "Avatar select" on storage.objects for select using (bucket_id = 'avatars');
create policy "Avatar insert" on storage.objects for insert with check (bucket_id = 'avatars' and name like (auth.uid()::text || '%'));
create policy "Avatar update" on storage.objects for update using (bucket_id = 'avatars' and name like (auth.uid()::text || '%'));
create policy "Avatar delete" on storage.objects for delete using (bucket_id = 'avatars' and name like (auth.uid()::text || '%'));
