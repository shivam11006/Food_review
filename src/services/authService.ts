// src/services/authService.ts
import { supabase } from './supabase';

export const authService = {
  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // redirect after email confirmation (if enabled)
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;

    // Only insert profile if user is confirmed immediately (email confirm OFF)
    // If email confirm is ON, the DB trigger handle_new_user will create it on first login
    if (data.user && data.session) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          { id: data.user.id, full_name: fullName, email },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      // Don't throw on profile error — trigger may have already created it
      if (profileError) console.warn('Profile upsert warning:', profileError.message);
    }
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Ensure profile exists (in case trigger didn't fire or email confirm was on)
    if (data.user) {
      await supabase
        .from('profiles')
        .upsert(
          {
            id: data.user.id,
            full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
            email: data.user.email!,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
    }
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: { full_name?: string; avatar_url?: string }) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
