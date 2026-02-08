-- Apply this if you already ran earlier migrations.
-- It converts auth-only + me/her model to no-auth + doudou/doudette model.

alter table public.reviews
  add column if not exists dish_name text,
  add column if not exists dish_photo_url text,
  add column if not exists favorite_dish boolean not null default false;

-- Drop old constraint before updating, so 'me'/'her' can become 'doudou'/'doudette'.
alter table public.reviews drop constraint if exists reviews_reviewer_check;

update public.reviews
set reviewer = case reviewer
  when 'me' then 'doudou'
  when 'her' then 'doudette'
  else reviewer
end;

alter table public.reviews add constraint reviews_reviewer_check check (reviewer in ('doudou', 'doudette'));
alter table public.reviews drop constraint if exists reviews_restaurant_id_reviewer_key;

-- Countries policies
drop policy if exists "authenticated read countries" on public.countries;
drop policy if exists "authenticated write countries" on public.countries;
drop policy if exists "authenticated insert countries" on public.countries;
drop policy if exists "public read countries" on public.countries;
drop policy if exists "public write countries" on public.countries;
drop policy if exists "public update countries" on public.countries;
create policy "public read countries" on public.countries for select to anon, authenticated using (true);
create policy "public write countries" on public.countries for insert to anon, authenticated with check (true);
create policy "public update countries" on public.countries for update to anon, authenticated using (true) with check (true);

-- Restaurants policies
drop policy if exists "authenticated read restaurants" on public.restaurants;
drop policy if exists "authenticated write restaurants" on public.restaurants;
drop policy if exists "authenticated delete restaurants" on public.restaurants;
drop policy if exists "public read restaurants" on public.restaurants;
drop policy if exists "public write restaurants" on public.restaurants;
drop policy if exists "public update restaurants" on public.restaurants;
drop policy if exists "public delete restaurants" on public.restaurants;
create policy "public read restaurants" on public.restaurants for select to anon, authenticated using (true);
create policy "public write restaurants" on public.restaurants for insert to anon, authenticated with check (true);
create policy "public update restaurants" on public.restaurants for update to anon, authenticated using (true) with check (true);
create policy "public delete restaurants" on public.restaurants for delete to anon, authenticated using (true);

-- Reviews policies
drop policy if exists "authenticated read reviews" on public.reviews;
drop policy if exists "authenticated write reviews" on public.reviews;
drop policy if exists "authenticated update reviews" on public.reviews;
drop policy if exists "public read reviews" on public.reviews;
drop policy if exists "public write reviews" on public.reviews;
drop policy if exists "public update reviews" on public.reviews;
drop policy if exists "public delete reviews" on public.reviews;
create policy "public read reviews" on public.reviews for select to anon, authenticated using (true);
create policy "public write reviews" on public.reviews for insert to anon, authenticated with check (true);
create policy "public update reviews" on public.reviews for update to anon, authenticated using (true) with check (true);
create policy "public delete reviews" on public.reviews for delete to anon, authenticated using (true);

-- Photos policies
drop policy if exists "authenticated read photos" on public.photos;
drop policy if exists "authenticated write photos" on public.photos;
drop policy if exists "public read photos" on public.photos;
drop policy if exists "public write photos" on public.photos;
drop policy if exists "public delete photos" on public.photos;
create policy "public read photos" on public.photos for select to anon, authenticated using (true);
create policy "public write photos" on public.photos for insert to anon, authenticated with check (true);
create policy "public delete photos" on public.photos for delete to anon, authenticated using (true);

-- Storage policies
drop policy if exists "authenticated can upload restaurant photos" on storage.objects;
drop policy if exists "owner can update restaurant photos" on storage.objects;
drop policy if exists "owner can delete restaurant photos" on storage.objects;
drop policy if exists "public can upload restaurant photos" on storage.objects;
drop policy if exists "public can update restaurant photos" on storage.objects;
drop policy if exists "public can delete restaurant photos" on storage.objects;
create policy "public can upload restaurant photos" on storage.objects
for insert to anon, authenticated with check (bucket_id = 'restaurant-photos');
create policy "public can update restaurant photos" on storage.objects
for update to anon, authenticated using (bucket_id = 'restaurant-photos') with check (bucket_id = 'restaurant-photos');
create policy "public can delete restaurant photos" on storage.objects
for delete to anon, authenticated using (bucket_id = 'restaurant-photos');

grant execute on function public.recompute_country_stats(text) to anon, authenticated;
