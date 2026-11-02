// src/services/partyService.ts
import { supabase } from './supabase';
import { generateSlug } from '../utils';
import type { Party } from '../types';

export const partyService = {
  async createParty(
    organizerId: string,
    data: {
      party_name: string;
      description?: string;
      event_date: string;
      venue?: string;
      cover_image?: string;
      review_deadline?: string;
    }
  ): Promise<Party> {
    const public_slug = generateSlug(data.party_name);

    // Clean up empty optional fields so they don't send empty strings
    const payload: Record<string, unknown> = {
      organizer_id: organizerId,
      party_name: data.party_name.trim(),
      public_slug,
      status: 'active',
      event_date: data.event_date,
    };
    if (data.description?.trim()) payload.description = data.description.trim();
    if (data.venue?.trim()) payload.venue = data.venue.trim();
    if (data.cover_image) payload.cover_image = data.cover_image;
    if (data.review_deadline) payload.review_deadline = data.review_deadline;

    const { data: party, error } = await supabase
      .from('parties')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return party;
  },

  async getMyParties(organizerId: string): Promise<Party[]> {
    const { data, error } = await supabase
      .from('parties')
      .select(`
        *,
        food_items(id),
        reviews(id)
      `)
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    // Attach counts manually
    return (data || []).map((p: Party & { food_items?: { id: string }[]; reviews?: { id: string }[] }) => ({
      ...p,
      food_item_count: p.food_items?.length ?? 0,
      review_count: p.reviews?.length ?? 0,
    }));
  },

  async getPartyById(partyId: string): Promise<Party> {
    const { data, error } = await supabase
      .from('parties')
      .select(`*, profiles(full_name, email)`)
      .eq('id', partyId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async getPartyBySlug(slug: string): Promise<Party> {
    const { data, error } = await supabase
      .from('parties')
      .select(`*, profiles(full_name, email)`)
      .eq('public_slug', slug)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateParty(
    partyId: string,
    updates: Partial<Omit<Party, 'id' | 'organizer_id' | 'public_slug' | 'created_at'>>
  ): Promise<Party> {
    const { data, error } = await supabase
      .from('parties')
      .update(updates)
      .eq('id', partyId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteParty(partyId: string): Promise<void> {
    const { error } = await supabase.from('parties').delete().eq('id', partyId);
    if (error) throw new Error(error.message);
  },

  async togglePartyStatus(partyId: string, status: 'active' | 'closed'): Promise<Party> {
    const { data, error } = await supabase
      .from('parties')
      .update({ status })
      .eq('id', partyId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async uploadCoverImage(file: File, partyId: string): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `covers/${partyId}.${ext}`;
    const { error } = await supabase.storage
      .from('food-images')
      .upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('food-images').getPublicUrl(path);
    return data.publicUrl;
  },
};
