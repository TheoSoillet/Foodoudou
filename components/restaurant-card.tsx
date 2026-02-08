import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Restaurant, Reviewer } from '@/lib/types';
import { restaurantMean } from '@/lib/ratings';

type RestaurantCardProps = {
  restaurant: Restaurant;
  onReview: () => void;
  onAddPics: () => void;
};

const reviewerLabel: Record<Reviewer, string> = {
  doudou: 'Doudou',
  doudette: 'Doudette'
};

export default function RestaurantCard({ restaurant, onReview, onAddPics }: RestaurantCardProps) {
  const mean = restaurantMean(restaurant.reviews);

  return (
    <article className="glass rounded-2xl p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold">{restaurant.name}</h4>
          <p className="text-sm text-slate-600">{format(new Date(restaurant.visited_at), 'PPP', { locale: fr })}</p>
        </div>
        <div className="rounded-xl bg-slate-900 px-3 py-1 text-sm font-semibold text-white">{mean.toFixed(1)}</div>
      </header>

      <div className="mt-3 flex flex-wrap gap-2">
        {restaurant.items.map((item) => (
          <span key={item.id} className="rounded-full border border-stroke bg-white/70 px-2.5 py-1 text-xs">
            {item.name}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {(['doudou', 'doudette'] as Reviewer[]).map((reviewer) => {
          const review = restaurant.reviews.find((entry) => entry.reviewer === reviewer);
          return (
            <div key={reviewer} className="rounded-xl border border-stroke bg-white/60 p-2.5">
              <p className="font-medium">{reviewerLabel[reviewer]}</p>
              <p className="text-slate-700">{review ? `${review.rating.toFixed(1)} / 10` : 'Pas encore noté'}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={onReview} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Noter
        </button>
        <button onClick={onAddPics} className="rounded-xl border border-stroke bg-white/80 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-white">
          Add pics
        </button>
      </div>
    </article>
  );
}
