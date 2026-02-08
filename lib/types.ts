export type Medal = 'gold' | 'silver' | 'bronze';
export type Reviewer = 'doudou' | 'doudette';
export type ItemCategory = 'plat' | 'boisson' | 'entree' | 'dessert' | 'autre';

export type Country = {
  code: string;
  name: string;
  avg_rating: number | null;
  medal: Medal;
};

export type RestaurantItem = {
  id: string;
  restaurant_id: string;
  name: string;
  category: ItemCategory;
  photo_url: string | null;
};

export type Review = {
  id: string;
  reviewer: Reviewer;
  rating: number;
  favorite_items: string[];
  comment: string | null;
  created_at: string;
};

export type Photo = {
  id: string;
  image_url: string;
};

export type Restaurant = {
  id: string;
  country_code: string;
  name: string;
  visited_at: string;
  items: RestaurantItem[];
  reviews: Review[];
  photos: Photo[];
};

export type CountryWithRestaurants = Country & {
  restaurants: Restaurant[];
};
