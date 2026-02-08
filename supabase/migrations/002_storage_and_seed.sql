-- Supabase Storage and sample seed data

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('restaurant-photos', 'restaurant-photos', true, 20971520, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "public can upload restaurant photos" on storage.objects;
create policy "public can upload restaurant photos"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'restaurant-photos');

drop policy if exists "public can read restaurant photos" on storage.objects;
create policy "public can read restaurant photos"
on storage.objects
for select
to public
using (bucket_id = 'restaurant-photos');

drop policy if exists "public can update restaurant photos" on storage.objects;
create policy "public can update restaurant photos"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'restaurant-photos')
with check (bucket_id = 'restaurant-photos');

drop policy if exists "public can delete restaurant photos" on storage.objects;
create policy "public can delete restaurant photos"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'restaurant-photos');

insert into public.countries (code, name, avg_rating, medal)
values
  ('CO', 'Colombie', null, 'bronze'),
  ('MN', 'Mongolie', null, 'bronze')
on conflict (code) do update set name = excluded.name;

with inserted_restaurants as (
  insert into public.restaurants (country_code, name, visited_at)
  values
    ('CO', 'Andes Bistro', '2025-11-12'),
    ('MN', 'Steppe Fire Kitchen', '2025-12-03')
  returning id, country_code
), inserted_items as (
  insert into public.restaurant_items (restaurant_id, name, category)
  select id, case when country_code = 'CO' then 'Arepas de choclo' else 'Manti' end, 'plat' from inserted_restaurants
  union all
  select id, case when country_code = 'CO' then 'Café filtre' else 'Thé salé' end, 'boisson' from inserted_restaurants
  returning restaurant_id, name
), inserted_reviews as (
  insert into public.reviews (restaurant_id, reviewer, rating, favorite_items, comment)
  select ir.id, 'doudou',
    case when ir.country_code = 'CO' then 8.4 else 6.2 end,
    array[(select name from inserted_items ii where ii.restaurant_id = ir.id limit 1)],
    case when ir.country_code = 'CO' then 'Super textures et sauces vibrantes.' else 'Très bon mais un peu salé.' end
  from inserted_restaurants ir
  union all
  select ir.id, 'doudette',
    case when ir.country_code = 'CO' then 8.1 else 6.8 end,
    array[(select name from inserted_items ii where ii.restaurant_id = ir.id limit 1)],
    case when ir.country_code = 'CO' then 'Belle harmonie café + arepas.' else 'Bouillon réconfortant.' end
  from inserted_restaurants ir
  returning restaurant_id
)
select count(*) from inserted_reviews;

select public.recompute_country_stats('CO');
select public.recompute_country_stats('MN');
