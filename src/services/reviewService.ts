// src/services/reviewService.ts
import { supabase } from './supabase';
import type { Review } from '../types';

export const reviewService = {
  async submitReview(data: {
    food_item_id: string;
    party_id: string;
    reviewer_name: string;
    rating: number;
    feedback?: string;
    reviewer_token: string;
  }): Promise<Review> {
    const { data: review, error } = await supabase
      .from('reviews')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return review;
  },

  async checkAlreadyReviewed(foodItemId: string, reviewerToken: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('food_item_id', foodItemId)
      .eq('reviewer_token', reviewerToken)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  },

  async getReviewsByParty(partyId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select(`*, food_items(dish_name, category)`)
      .eq('party_id', partyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getReviewsByOrganizer(organizerId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select(`*, food_items(dish_name, category), parties(party_name, organizer_id)`)
      .eq('parties.organizer_id', organizerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).filter(
      (r: Review & { parties?: { organizer_id: string } }) =>
        r.parties?.organizer_id === organizerId
    );
  },

  async getAllReviewsForOrganizer(organizerId: string): Promise<Review[]> {
    // Get parties first then reviews
    const { data: parties, error: partiesError } = await supabase
      .from('parties')
      .select('id')
      .eq('organizer_id', organizerId);
    if (partiesError) throw partiesError;

    const partyIds = (parties || []).map((p: { id: string }) => p.id);
    if (partyIds.length === 0) return [];

    const { data, error } = await supabase
      .from('reviews')
      .select(`*, food_items(dish_name, category), parties(party_name)`)
      .in('party_id', partyIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async deleteReview(reviewId: string): Promise<void> {
    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
    if (error) throw error;
  },

  async getAnalyticsForOrganizer(organizerId: string) {
    const { data: parties, error: partiesError } = await supabase
      .from('parties')
      .select('id')
      .eq('organizer_id', organizerId);
    if (partiesError) throw partiesError;

    const partyIds = (parties || []).map((p: { id: string }) => p.id);
    if (partyIds.length === 0) {
      return { total: 0, average: 0, byRating: {}, byDish: [], overTime: [] };
    }

    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`rating, created_at, food_items(dish_name)`)
      .in('party_id', partyIds);
    if (error) throw error;

    const total = reviews?.length || 0;
    const average =
      total > 0
        ? (reviews || []).reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / total
        : 0;

    // Rating distribution
    const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (reviews || []).forEach((r: { rating: number }) => {
      byRating[r.rating] = (byRating[r.rating] || 0) + 1;
    });

    // By dish
    const dishMap: Record<string, { name: string; total: number; sum: number }> = {};
    (reviews || []).forEach((r: { rating: number; food_items?: { dish_name: string }[] | { dish_name: string } | null }) => {
      const fi = r.food_items;
      const name = (Array.isArray(fi) ? fi[0]?.dish_name : fi?.dish_name) || 'Unknown';
      if (!dishMap[name]) dishMap[name] = { name, total: 0, sum: 0 };
      dishMap[name].total += 1;
      dishMap[name].sum += (r.rating as number);
    });
    const byDish = Object.values(dishMap).map((d) => ({
      name: d.name,
      count: d.total,
      average: Number((d.sum / d.total).toFixed(1)),
    }));

    // Over time (last 30 days, grouped by day)
    const timeMap: Record<string, number> = {};
    (reviews || []).forEach((r: { created_at: string }) => {
      const day = new Date(r.created_at).toLocaleDateString('en-CA');
      timeMap[day] = (timeMap[day] || 0) + 1;
    });
    const overTime = Object.entries(timeMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { total, average: Number(average.toFixed(1)), byRating, byDish, overTime };
  },
};
