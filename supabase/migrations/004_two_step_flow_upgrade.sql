-- Upgrade existing installs to the 2-step French flow.

create table if not exists public.restaurant_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  category text not null check (category in ('plat', 'boisson', 'entree', 'dessert', 'autre')),
  photo_url text
);

create index if not exists restaurant_items_restaurant_id_idx on public.restaurant_items(restaurant_id);
alter table public.restaurant_items enable row level security;

drop policy if exists "public read restaurant_items" on public.restaurant_items;
create policy "public read restaurant_items" on public.restaurant_items for select to anon, authenticated using (true);
drop policy if exists "public write restaurant_items" on public.restaurant_items;
create policy "public write restaurant_items" on public.restaurant_items for insert to anon, authenticated with check (true);
drop policy if exists "public update restaurant_items" on public.restaurant_items;
create policy "public update restaurant_items" on public.restaurant_items for update to anon, authenticated using (true) with check (true);
drop policy if exists "public delete restaurant_items" on public.restaurant_items;
create policy "public delete restaurant_items" on public.restaurant_items for delete to anon, authenticated using (true);

alter table public.reviews
  add column if not exists favorite_items text[] not null default '{}';

-- Convert old fields when present.
update public.reviews
set favorite_items = array[dish_name]
where favorite_items = '{}' and coalesce(favorite_dish, false) is true and dish_name is not null and dish_name <> '';

alter table public.reviews drop constraint if exists reviews_restaurant_id_reviewer_key;
alter table public.reviews add constraint reviews_restaurant_id_reviewer_key unique (restaurant_id, reviewer);

-- Merge accidental duplicate restaurants by (country_code, name, visited_at)
-- before adding the uniqueness constraint.
with duplicate_groups as (
  select country_code, name, visited_at, (array_agg(id order by id))[1] as keep_id, array_agg(id) as all_ids
  from public.restaurants
  group by country_code, name, visited_at
  having count(*) > 1
), duplicate_rows as (
  select dg.keep_id, unnest(dg.all_ids) as duplicate_id
  from duplicate_groups dg
), rows_to_move as (
  select keep_id, duplicate_id
  from duplicate_rows
  where duplicate_id <> keep_id
)
update public.restaurant_items ri
set restaurant_id = rtm.keep_id
from rows_to_move rtm
where ri.restaurant_id = rtm.duplicate_id;

with duplicate_groups as (
  select country_code, name, visited_at, (array_agg(id order by id))[1] as keep_id, array_agg(id) as all_ids
  from public.restaurants
  group by country_code, name, visited_at
  having count(*) > 1
), duplicate_rows as (
  select dg.keep_id, unnest(dg.all_ids) as duplicate_id
  from duplicate_groups dg
), rows_to_move as (
  select keep_id, duplicate_id
  from duplicate_rows
  where duplicate_id <> keep_id
)
update public.reviews rv
set restaurant_id = rtm.keep_id
from rows_to_move rtm
where rv.restaurant_id = rtm.duplicate_id
  and not exists (
    select 1
    from public.reviews rv2
    where rv2.restaurant_id = rtm.keep_id and rv2.reviewer = rv.reviewer
  );

with duplicate_groups as (
  select country_code, name, visited_at, (array_agg(id order by id))[1] as keep_id, array_agg(id) as all_ids
  from public.restaurants
  group by country_code, name, visited_at
  having count(*) > 1
), duplicate_rows as (
  select dg.keep_id, unnest(dg.all_ids) as duplicate_id
  from duplicate_groups dg
), rows_to_move as (
  select keep_id, duplicate_id
  from duplicate_rows
  where duplicate_id <> keep_id
)
update public.photos p
set restaurant_id = rtm.keep_id
from rows_to_move rtm
where p.restaurant_id = rtm.duplicate_id;

with duplicate_groups as (
  select country_code, name, visited_at, (array_agg(id order by id))[1] as keep_id, array_agg(id) as all_ids
  from public.restaurants
  group by country_code, name, visited_at
  having count(*) > 1
), duplicate_rows as (
  select dg.keep_id, unnest(dg.all_ids) as duplicate_id
  from duplicate_groups dg
), rows_to_delete as (
  select duplicate_id
  from duplicate_rows
  where duplicate_id <> keep_id
)
delete from public.restaurants r
using rows_to_delete d
where r.id = d.duplicate_id;

alter table public.restaurants drop constraint if exists restaurants_country_code_name_visited_at_key;
alter table public.restaurants add constraint restaurants_country_code_name_visited_at_key unique (country_code, name, visited_at);

-- Legacy cleanup optional: keep old columns for compatibility.
-- alter table public.reviews drop column if exists dish_name;
-- alter table public.reviews drop column if exists dish_photo_url;
-- alter table public.reviews drop column if exists favorite_dish;
