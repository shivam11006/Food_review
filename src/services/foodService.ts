// src/services/foodService.ts
import { supabase } from './supabase';
import type { FoodItem } from '../types';

export const foodService = {
  async addFoodItem(
    partyId: string,
    data: {
      dish_name: string;
      description?: string;
      category: FoodItem['category'];
      image_url?: string;
    }
  ): Promise<FoodItem> {
    const { data: item, error } = await supabase
      .from('food_items')
      .insert({ ...data, party_id: partyId })
      .select()
      .single();
    if (error) throw error;
    return item;
  },

  async getFoodItemsByParty(partyId: string): Promise<FoodItem[]> {
    const { data, error } = await supabase
      .from('food_items')
      .select(`
        *,
        reviews(rating)
      `)
      .eq('party_id', partyId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    // Compute average ratings
    return (data || []).map((item: FoodItem & { reviews?: { rating: number }[] }) => {
      const reviews = item.reviews || [];
      const avg =
        reviews.length > 0
          ? reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.length
          : 0;
      return { ...item, average_rating: Number(avg.toFixed(1)), review_count: reviews.length };
    });
  },

  async updateFoodItem(
    itemId: string,
    updates: Partial<Omit<FoodItem, 'id' | 'party_id' | 'created_at'>>
  ): Promise<FoodItem> {
    const { data, error } = await supabase
      .from('food_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteFoodItem(itemId: string): Promise<void> {
    const { error } = await supabase.from('food_items').delete().eq('id', itemId);
    if (error) throw error;
  },

  async uploadFoodImage(file: File, itemId: string): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `food/${itemId}.${ext}`;
    const { error } = await supabase.storage.from('food-images').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('food-images').getPublicUrl(path);
    return data.publicUrl;
  },
};
