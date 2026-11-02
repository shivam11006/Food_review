// src/services/supabase.ts
import { createClient } from "@supabase/supabase-js";

// Supabase URL and anon public key should be provided via environment variables.
// Vite exposes env variables prefixed with VITE_ automatically.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = typeof supabase; // placeholder type for future use
