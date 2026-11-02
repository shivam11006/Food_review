// src/types/index.ts

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface Party {
  id: string;
  organizer_id: string;
  party_name: string;
  description?: string;
  event_date: string;
  venue?: string;
  cover_image?: string;
  public_slug: string;
  status: 'active' | 'closed';
  review_deadline?: string;
  created_at: string;
  updated_at: string;
  // joined
  profiles?: Profile;
  food_items?: FoodItem[];
  reviews?: Review[];
}

export interface FoodItem {
  id: string;
  party_id: string;
  dish_name: string;
  description?: string;
  category: 'Starter' | 'Main Course' | 'Dessert' | 'Beverage' | 'Snack' | 'Other';
  image_url?: string;
  created_at: string;
  updated_at: string;
  // computed
  average_rating?: number;
  review_count?: number;
}

export interface Review {
  id: string;
  food_item_id: string;
  party_id: string;
  reviewer_name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  reviewer_token?: string;
  created_at: string;
  // joined
  food_items?: FoodItem;
  parties?: Party;
}

export interface DashboardStats {
  totalParties: number;
  totalFoodItems: number;
  totalReviews: number;
  averageRating: number;
}

export interface AuthUser {
  id: string;
  email: string;
}
