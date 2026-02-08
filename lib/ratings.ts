import type { Medal, Restaurant } from '@/lib/types';

export function parseRating(raw: string): number | null {
  const normalized = raw.replace(',', '.').trim();
  const num = Number.parseFloat(normalized);
  if (Number.isNaN(num)) {
    return null;
  }
  return Math.max(0, Math.min(10, num));
}

export function medalFromAvg(avg: number): Medal {
  if (avg >= 7.5) {
    return 'gold';
  }
  if (avg >= 4.0) {
    return 'silver';
  }
  return 'bronze';
}

export function restaurantMean(reviews: Restaurant['reviews']): number {
  if (!reviews.length) {
    return 0;
  }
  const total = reviews.reduce((acc, review) => acc + review.rating, 0);
  return total / reviews.length;
}
