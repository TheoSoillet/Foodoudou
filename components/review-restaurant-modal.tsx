'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import type { Restaurant, Reviewer } from '@/lib/types';
import { supabaseBrowser } from '@/lib/supabase-browser';

type ReviewRestaurantModalProps = {
  open: boolean;
  restaurant: Restaurant | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

const reviewerOptions: { value: Reviewer; label: string }[] = [
  { value: 'doudou', label: 'Doudou' },
  { value: 'doudette', label: 'Doudette' }
];

function emojiForRating(rating: number): string {
  if (rating >= 9) return '🤩';
  if (rating >= 7.5) return '😍';
  if (rating >= 5) return '🙂';
  if (rating >= 3) return '😕';
  return '🥲';
}

export default function ReviewRestaurantModal({ open, restaurant, onClose, onSaved }: ReviewRestaurantModalProps) {
  const [reviewer, setReviewer] = useState<Reviewer>('doudou');
  const [rating, setRating] = useState(7.5);
  const [favoriteItems, setFavoriteItems] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const items = restaurant?.items ?? [];

  const existingReview = useMemo(
    () => restaurant?.reviews.find((review) => review.reviewer === reviewer),
    [restaurant, reviewer]
  );

  useEffect(() => {
    if (!open) return;
    if (!existingReview) {
      setRating(7.5);
      setComment('');
      setFavoriteItems([]);
      return;
    }
    setRating(existingReview.rating);
    setComment(existingReview.comment ?? '');
    setFavoriteItems(existingReview.favorite_items ?? []);
  }, [existingReview, open]);

  function toggleFavorite(name: string) {
    setFavoriteItems((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurant) return;

    setError('');
    setIsSaving(true);

    try {
      async function saveForRestaurantId(restaurantId: string) {
        const { error } = await supabaseBrowser.from('reviews').upsert(
          {
            restaurant_id: restaurantId,
            reviewer,
            rating,
            favorite_items: favoriteItems,
            comment: comment.trim() || null
          },
          { onConflict: 'restaurant_id,reviewer' }
        );
        return error;
      }

      let upsertError = await saveForRestaurantId(restaurant.id);

      // If the selected row was deleted (stale UI state), resolve the canonical restaurant and retry once.
      if (upsertError?.message.includes('reviews_restaurant_id_fkey')) {
        const { data: currentRestaurant, error: lookupError } = await supabaseBrowser
          .from('restaurants')
          .select('id')
          .eq('country_code', restaurant.country_code)
          .eq('name', restaurant.name)
          .eq('visited_at', restaurant.visited_at)
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (lookupError || !currentRestaurant) {
          throw new Error(
            "Ce restaurant n'existe plus en base. Rafraîchis la page puis réessaie."
          );
        }

        upsertError = await saveForRestaurantId(currentRestaurant.id);
      }

      if (upsertError) throw new Error(upsertError.message);

      const { error: recomputeErr } = await supabaseBrowser.rpc('recompute_country_stats', {
        p_country_code: restaurant.country_code
      });
      if (recomputeErr) throw new Error(recomputeErr.message);

      await onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Une erreur est survenue.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!open || !restaurant) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs">
      <section className="glass w-full max-w-3xl rounded-3xl p-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Étape 2/2</p>
            <h3 className="text-xl font-semibold">Note ton expérience</h3>
            <p className="text-sm text-slate-600">{restaurant.name}</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-stroke px-3 py-1.5 text-sm hover:bg-white/70">
            Fermer
          </button>
        </header>

        <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
          <div>
            <p className="mb-2 text-sm font-medium">Qui note ?</p>
            <div className="inline-flex rounded-2xl border border-stroke bg-white/70 p-1">
              {reviewerOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReviewer(option.value)}
                  className={clsx(
                    'rounded-xl px-4 py-2 text-sm transition',
                    reviewer === option.value ? 'bg-slate-900 text-white shadow' : 'text-slate-700 hover:bg-white'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Plats dégustés: choisis les favoris</p>
            <div className="grid gap-2 md:grid-cols-2">
              {items.length ? (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleFavorite(item.name)}
                    className={clsx(
                      'rounded-2xl border p-3 text-left transition',
                      favoriteItems.includes(item.name)
                        ? 'border-amber-400 bg-amber-50 shadow'
                        : 'border-stroke bg-white/70 hover:bg-white'
                    )}
                  >
                    <p className="text-xs uppercase text-slate-500">{item.category}</p>
                    <p className="font-medium">{item.name}</p>
                  </button>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-stroke bg-white/70 p-3 text-sm text-slate-500">
                  Aucun plat enregistré pour ce restaurant.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-stroke bg-white/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Note globale</p>
              <p className="text-lg font-semibold">
                {rating.toFixed(1)} <span className="text-2xl">{emojiForRating(rating)}</span>
              </p>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gradient-to-r from-rose-300 via-amber-300 to-emerald-400"
            />
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>0</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Commentaire</span>
            <textarea
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="w-full rounded-2xl border border-stroke bg-white/80 px-3 py-2"
              placeholder="Ce qu'on a adoré, ce qu'on changerait, ambiance, service..."
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {isSaving ? 'Sauvegarde...' : 'Enregistrer la note'}
          </button>
        </form>
      </section>
    </div>
  );
}
