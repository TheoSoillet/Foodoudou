import type { CountryWithRestaurants, Restaurant } from '@/lib/types';

function mergeRestaurants(primary: Restaurant, secondary: Restaurant): Restaurant {
  const items = [...primary.items, ...secondary.items];
  const photos = [...primary.photos, ...secondary.photos];
  const reviews = [...primary.reviews, ...secondary.reviews];

  return {
    ...primary,
    items: Array.from(new Map(items.map((item) => [item.id, item])).values()),
    photos: Array.from(new Map(photos.map((photo) => [photo.id, photo])).values()),
    reviews: Array.from(new Map(reviews.map((review) => [review.reviewer, review])).values())
  };
}

function dedupeRestaurants(restaurants: Restaurant[]): Restaurant[] {
  const byKey = new Map<string, Restaurant>();

  for (const restaurant of restaurants) {
    const key = `${restaurant.country_code}|${restaurant.name.trim().toLowerCase()}|${restaurant.visited_at}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, restaurant);
      continue;
    }

    const merged = mergeRestaurants(existing, restaurant);
    byKey.set(key, merged);
  }

  return Array.from(byKey.values());
}

export function normalizeCountries(raw: any[]): CountryWithRestaurants[] {
  return (raw ?? []).map((country) => ({
    ...country,
    restaurants: dedupeRestaurants(
      (country.restaurants ?? []).map((restaurant: any) => ({
        ...restaurant,
        items: restaurant.restaurant_items ?? []
      }))
    )
  }));
}
