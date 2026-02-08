-- World Cuisine Map schema (2-step flow)

create extension if not exists pgcrypto;

create table if not exists public.countries (
  code text primary key check (char_length(code) = 2),
  name text not null,
  avg_rating double precision,
  medal text not null default 'bronze' check (medal in ('gold', 'silver', 'bronze'))
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries(code) on delete cascade,
  name text not null,
  visited_at date not null,
  unique (country_code, name, visited_at)
);

create table if not exists public.restaurant_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  category text not null check (category in ('plat', 'boisson', 'entree', 'dessert', 'autre')),
  photo_url text
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  reviewer text not null check (reviewer in ('doudou', 'doudette')),
  rating double precision not null check (rating >= 0 and rating <= 10),
  favorite_items text[] not null default '{}',
  comment text,
  created_at timestamptz not null default now(),
  unique (restaurant_id, reviewer)
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  image_url text not null
);

create index if not exists restaurants_country_code_idx on public.restaurants(country_code);
create index if not exists restaurant_items_restaurant_id_idx on public.restaurant_items(restaurant_id);
create index if not exists reviews_restaurant_id_idx on public.reviews(restaurant_id);
create index if not exists photos_restaurant_id_idx on public.photos(restaurant_id);

alter table public.countries enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_items enable row level security;
alter table public.reviews enable row level security;
alter table public.photos enable row level security;

drop policy if exists "public read countries" on public.countries;
create policy "public read countries" on public.countries for select to anon, authenticated using (true);
drop policy if exists "public write countries" on public.countries;
create policy "public write countries" on public.countries for insert to anon, authenticated with check (true);
drop policy if exists "public update countries" on public.countries;
create policy "public update countries" on public.countries for update to anon, authenticated using (true) with check (true);

drop policy if exists "public read restaurants" on public.restaurants;
create policy "public read restaurants" on public.restaurants for select to anon, authenticated using (true);
drop policy if exists "public write restaurants" on public.restaurants;
create policy "public write restaurants" on public.restaurants for insert to anon, authenticated with check (true);
drop policy if exists "public update restaurants" on public.restaurants;
create policy "public update restaurants" on public.restaurants for update to anon, authenticated using (true) with check (true);
drop policy if exists "public delete restaurants" on public.restaurants;
create policy "public delete restaurants" on public.restaurants for delete to anon, authenticated using (true);

drop policy if exists "public read restaurant_items" on public.restaurant_items;
create policy "public read restaurant_items" on public.restaurant_items for select to anon, authenticated using (true);
drop policy if exists "public write restaurant_items" on public.restaurant_items;
create policy "public write restaurant_items" on public.restaurant_items for insert to anon, authenticated with check (true);
drop policy if exists "public update restaurant_items" on public.restaurant_items;
create policy "public update restaurant_items" on public.restaurant_items for update to anon, authenticated using (true) with check (true);
drop policy if exists "public delete restaurant_items" on public.restaurant_items;
create policy "public delete restaurant_items" on public.restaurant_items for delete to anon, authenticated using (true);

drop policy if exists "public read reviews" on public.reviews;
create policy "public read reviews" on public.reviews for select to anon, authenticated using (true);
drop policy if exists "public write reviews" on public.reviews;
create policy "public write reviews" on public.reviews for insert to anon, authenticated with check (true);
drop policy if exists "public update reviews" on public.reviews;
create policy "public update reviews" on public.reviews for update to anon, authenticated using (true) with check (true);
drop policy if exists "public delete reviews" on public.reviews;
create policy "public delete reviews" on public.reviews for delete to anon, authenticated using (true);

drop policy if exists "public read photos" on public.photos;
create policy "public read photos" on public.photos for select to anon, authenticated using (true);
drop policy if exists "public write photos" on public.photos;
create policy "public write photos" on public.photos for insert to anon, authenticated with check (true);
drop policy if exists "public delete photos" on public.photos;
create policy "public delete photos" on public.photos for delete to anon, authenticated using (true);

create or replace function public.recompute_country_stats(p_country_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg double precision;
  v_medal text;
begin
  select avg(rv.rating)
  into v_avg
  from public.restaurants r
  join public.reviews rv on rv.restaurant_id = r.id
  where r.country_code = p_country_code;

  v_medal := case
    when coalesce(v_avg, 0) >= 7.5 then 'gold'
    when coalesce(v_avg, 0) >= 4.0 then 'silver'
    else 'bronze'
  end;

  update public.countries
  set avg_rating = v_avg,
      medal = v_medal
  where code = p_country_code;
end;
$$;

grant execute on function public.recompute_country_stats(text) to anon, authenticated;

create or replace function public.recompute_country_stats_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_country_code text;
begin
  if tg_table_name = 'restaurants' then
    v_country_code := coalesce(new.country_code, old.country_code);
  else
    select country_code into v_country_code
    from public.restaurants
    where id = coalesce(new.restaurant_id, old.restaurant_id);
  end if;

  if v_country_code is not null then
    perform public.recompute_country_stats(v_country_code);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists restaurants_recompute_country on public.restaurants;
create trigger restaurants_recompute_country after insert or update or delete on public.restaurants
for each row execute function public.recompute_country_stats_trigger();

drop trigger if exists reviews_recompute_country on public.reviews;
create trigger reviews_recompute_country after insert or update or delete on public.reviews
for each row execute function public.recompute_country_stats_trigger();
