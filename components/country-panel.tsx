'use client';

import clsx from 'clsx';
import type { CountryWithRestaurants, Medal, Restaurant } from '@/lib/types';
import RestaurantCard from '@/components/restaurant-card';

type CountryPanelProps = {
  country: CountryWithRestaurants | null;
  onAddRestaurant: () => void;
  onReviewRestaurant: (restaurant: Restaurant) => void;
  onAddPicsRestaurant: (restaurant: Restaurant) => void;
  onClose: () => void;
};

const medalClasses: Record<Medal, string> = {
  gold: 'bg-gold text-slate-900',
  silver: 'bg-silver text-slate-900',
  bronze: 'bg-bronze text-white'
};

function countryFlag(code: string): string {
  if (code.length !== 2) return '🌍';
  const chars = code
    .toUpperCase()
    .split('')
    .map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65);
  return String.fromCodePoint(...chars);
}

export default function CountryPanel({
  country,
  onAddRestaurant,
  onReviewRestaurant,
  onAddPicsRestaurant,
  onClose
}: CountryPanelProps) {
  if (!country) return null;

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-20 max-h-[72vh] rounded-t-3xl border border-stroke bg-panel p-4 shadow-glass backdrop-blur-md transition duration-300 md:bottom-6 md:left-auto md:right-6 md:top-6 md:max-h-[calc(100vh-3rem)] md:w-[460px] md:rounded-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl">{countryFlag(country.code)}</p>
          <h2 className="mt-1 text-xl font-semibold">{country.name}</h2>
          <p className="text-sm text-slate-600">Code pays: {country.code}</p>
        </div>

        <button onClick={onClose} className="rounded-xl border border-stroke px-3 py-1.5 text-sm transition hover:bg-white/70">
          Fermer
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
          Moyenne {country.avg_rating?.toFixed(1) ?? '0.0'}
        </div>
        <div className={clsx('rounded-xl px-3 py-2 text-sm font-semibold capitalize', medalClasses[country.medal])}>
          {country.medal}
        </div>
        <button
          onClick={onAddRestaurant}
          className="ml-auto rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Ajouter un restaurant
        </button>
      </div>

      <div className="mt-4 space-y-3 overflow-y-auto pb-4">
        {country.restaurants.length ? (
          country.restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onReview={() => onReviewRestaurant(restaurant)}
              onAddPics={() => onAddPicsRestaurant(restaurant)}
            />
          ))
        ) : (
          <p className="glass rounded-2xl p-4 text-sm text-slate-600">Aucune visite enregistrée.</p>
        )}
      </div>
    </aside>
  );
}
