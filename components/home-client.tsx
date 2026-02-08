'use client';

import { useMemo, useState } from 'react';
import GlobeMap from '@/components/globe-map';
import CountryPanel from '@/components/country-panel';
import AddRestaurantModal from '@/components/add-restaurant-modal';
import ReviewRestaurantModal from '@/components/review-restaurant-modal';
import AddPicsModal from '@/components/add-pics-modal';
import type { CountryWithRestaurants, Restaurant } from '@/lib/types';
import { normalizeCountries } from '@/lib/normalize-data';
import { supabaseBrowser } from '@/lib/supabase-browser';

type HomeClientProps = {
  initialCountries: CountryWithRestaurants[];
};

export default function HomeClient({ initialCountries }: HomeClientProps) {
  const [countries, setCountries] = useState(initialCountries);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedCountryCenter, setSelectedCountryCenter] = useState<[number, number] | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [restaurantToReview, setRestaurantToReview] = useState<Restaurant | null>(null);
  const [restaurantToAddPics, setRestaurantToAddPics] = useState<Restaurant | null>(null);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.code === selectedCountryCode) ?? null,
    [countries, selectedCountryCode]
  );
  const selectedCountryPhotos = useMemo(
    () => (selectedCountry ? selectedCountry.restaurants.flatMap((restaurant) => restaurant.photos.map((photo) => photo.image_url)) : []),
    [selectedCountry]
  );

  const refreshData = async () => {
    const { data, error } = await supabaseBrowser
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

    if (!error) {
      const normalized = normalizeCountries(data ?? []);
      setCountries(normalized as CountryWithRestaurants[]);
    }
  };

  const handleCountrySelect = (countryCode: string, countryName?: string, center?: [number, number]) => {
    setSelectedCountryCode(countryCode);
    if (center) {
      setSelectedCountryCenter(center);
    }

    setCountries((prev) => {
      if (prev.some((country) => country.code === countryCode)) {
        return prev;
      }

      return [
        ...prev,
        {
          code: countryCode,
          name: countryName || countryCode,
          avg_rating: null,
          medal: 'bronze',
          restaurants: []
        }
      ];
    });
  };

  return (
    <main className="relative h-screen w-full overflow-hidden">
      <GlobeMap
        countries={countries}
        selectedCountryCode={selectedCountryCode}
        selectedCountryCenter={selectedCountryCenter}
        selectedCountryPhotos={selectedCountryPhotos}
        onCountrySelect={handleCountrySelect}
      />

      <header className="glass absolute left-4 right-4 top-4 z-20 flex items-center gap-3 rounded-2xl px-4 py-3 md:left-6 md:right-auto md:min-w-[420px]">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Foodoudou</h1>
          <p className="text-sm text-slate-600">Carnet de voyage culinaire, by Doudou et Doudette.</p>
        </div>
      </header>

      <CountryPanel
        country={selectedCountry}
        onClose={() => {
          setSelectedCountryCode(null);
          setSelectedCountryCenter(null);
        }}
        onAddRestaurant={() => setIsAddModalOpen(true)}
        onReviewRestaurant={(restaurant) => setRestaurantToReview(restaurant)}
        onAddPicsRestaurant={(restaurant) => setRestaurantToAddPics(restaurant)}
      />

      <AddRestaurantModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        countries={countries}
        selectedCountryCode={selectedCountryCode}
        onCreated={refreshData}
      />

      <ReviewRestaurantModal
        open={Boolean(restaurantToReview)}
        restaurant={restaurantToReview}
        onClose={() => setRestaurantToReview(null)}
        onSaved={refreshData}
      />

      <AddPicsModal
        open={Boolean(restaurantToAddPics)}
        restaurant={restaurantToAddPics}
        onClose={() => setRestaurantToAddPics(null)}
        onSaved={refreshData}
      />
    </main>
  );
}
