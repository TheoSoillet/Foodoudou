import HomeClient from '@/components/home-client';
import type { CountryWithRestaurants } from '@/lib/types';
import { normalizeCountries } from '@/lib/normalize-data';
import { env } from '@/lib/env';
import { createClient } from '@supabase/supabase-js';

async function getInitialData(): Promise<CountryWithRestaurants[]> {
  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data } = await supabase
    .from('countries')
    .select(
      `
        code,
        name,
        avg_rating,
        medal,
        restaurants (
          id,
          country_code,
          name,
          visited_at,
          restaurant_items (id, restaurant_id, name, category, photo_url),
          reviews (id, reviewer, rating, favorite_items, comment, created_at),
          photos (id, image_url)
        )
      `
    )
    .order('name', { ascending: true })
    .order('visited_at', { foreignTable: 'restaurants', ascending: false });

  const normalized = normalizeCountries(data ?? []);

  return normalized as CountryWithRestaurants[];
}

export default async function HomePage() {
  const countries = await getInitialData();
  return <HomeClient initialCountries={countries} />;
}
