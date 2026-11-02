-- ============================================================
-- FOOD REVIEW PLATFORM — SUPABASE SCHEMA + RLS POLICIES (FIXED)
-- Run this entire script in: Supabase Dashboard → SQL Editor
-- ============================================================


-- ============================================================
-- STEP 1: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- STEP 2: TABLES
-- ============================================================

-- ------- profiles -------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------- parties -------
CREATE TABLE IF NOT EXISTS public.parties (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  party_name       TEXT NOT NULL,
  description      TEXT,
  event_date       DATE NOT NULL,
  venue            TEXT,
  cover_image      TEXT,
  public_slug      TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  review_deadline  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------- food_items -------
CREATE TABLE IF NOT EXISTS public.food_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id     UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  dish_name    TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL DEFAULT 'Other'
               CHECK (category IN ('Starter','Main Course','Dessert','Beverage','Snack','Other')),
  image_url    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------- reviews -------
CREATE TABLE IF NOT EXISTS public.reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  food_item_id    UUID NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  party_id        UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  reviewer_name   TEXT NOT NULL,
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback        TEXT,
  reviewer_token  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- STEP 3: INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_parties_organizer  ON public.parties(organizer_id);
CREATE INDEX IF NOT EXISTS idx_parties_slug       ON public.parties(public_slug);
CREATE INDEX IF NOT EXISTS idx_food_items_party   ON public.food_items(party_id);
CREATE INDEX IF NOT EXISTS idx_reviews_food_item  ON public.reviews(food_item_id);
CREATE INDEX IF NOT EXISTS idx_reviews_party      ON public.reviews(party_id);
CREATE INDEX IF NOT EXISTS idx_reviews_token_item ON public.reviews(reviewer_token, food_item_id);


-- ============================================================
-- STEP 4: UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parties_updated_at    ON public.parties;
DROP TRIGGER IF EXISTS trg_food_items_updated_at ON public.food_items;

CREATE TRIGGER trg_parties_updated_at
  BEFORE UPDATE ON public.parties
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_food_items_updated_at
  BEFORE UPDATE ON public.food_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- STEP 5: AUTO-CREATE PROFILE ON SIGN UP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_user ON auth.users;

CREATE TRIGGER trg_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews     ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 7: DROP ALL OLD POLICIES (clean slate)
-- ============================================================
DO $$ DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles','parties','food_items','reviews')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;


-- ============================================================
-- STEP 8: RLS POLICIES — profiles
-- ============================================================

-- Anyone can read any profile (needed for public review page to show organizer name)
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can insert their own profile (sign-up flow, app-level insert)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ============================================================
-- STEP 9: RLS POLICIES — parties
-- ============================================================

-- Authenticated organizers can do everything on their own parties
CREATE POLICY "parties_all_organizer"
  ON public.parties FOR ALL
  TO authenticated
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

-- Public (unauthenticated) can read active parties by slug
CREATE POLICY "parties_select_public_active"
  ON public.parties FOR SELECT
  USING (status = 'active');


-- ============================================================
-- STEP 10: RLS POLICIES — food_items
-- ============================================================

-- Organizers can fully manage food items in their own parties
CREATE POLICY "food_items_all_organizer"
  ON public.food_items FOR ALL
  TO authenticated
  USING (
    party_id IN (
      SELECT id FROM public.parties WHERE organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    party_id IN (
      SELECT id FROM public.parties WHERE organizer_id = auth.uid()
    )
  );

-- Public can read food items for active parties (guest review page)
CREATE POLICY "food_items_select_public"
  ON public.food_items FOR SELECT
  USING (
    party_id IN (
      SELECT id FROM public.parties WHERE status = 'active'
    )
  );


-- ============================================================
-- STEP 11: RLS POLICIES — reviews
-- ============================================================

-- Everyone can read reviews (guests check duplicates, organizers view them)
CREATE POLICY "reviews_select_all"
  ON public.reviews FOR SELECT
  USING (true);

-- Anyone (anon guests) can insert reviews for active non-expired parties
CREATE POLICY "reviews_insert_public"
  ON public.reviews FOR INSERT
  WITH CHECK (
    party_id IN (
      SELECT id FROM public.parties
      WHERE status = 'active'
        AND (review_deadline IS NULL OR review_deadline > NOW())
    )
    AND rating BETWEEN 1 AND 5
    AND LENGTH(TRIM(reviewer_name)) >= 2
  );

-- Only organizers can delete reviews from their own parties
CREATE POLICY "reviews_delete_organizer"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (
    party_id IN (
      SELECT id FROM public.parties WHERE organizer_id = auth.uid()
    )
  );


-- ============================================================
-- STEP 12: STORAGE — food-images bucket
-- ============================================================

-- Create the bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop old storage policies if any
DROP POLICY IF EXISTS "storage: organizer upload"  ON storage.objects;
DROP POLICY IF EXISTS "storage: organizer update"  ON storage.objects;
DROP POLICY IF EXISTS "storage: organizer delete"  ON storage.objects;
DROP POLICY IF EXISTS "storage: public read"       ON storage.objects;
DROP POLICY IF EXISTS "storage_insert_auth"        ON storage.objects;
DROP POLICY IF EXISTS "storage_update_auth"        ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_auth"        ON storage.objects;
DROP POLICY IF EXISTS "storage_select_all"         ON storage.objects;

-- Authenticated users can upload images
CREATE POLICY "storage_insert_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'food-images');

-- Authenticated users can update/replace images
CREATE POLICY "storage_update_auth"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'food-images');

-- Authenticated users can delete images
CREATE POLICY "storage_delete_auth"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'food-images');

-- Everyone can view images (public bucket)
CREATE POLICY "storage_select_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'food-images');


-- ============================================================
-- DONE! Your database is ready.
-- ============================================================
-- Tables:     profiles, parties, food_items, reviews
-- Triggers:   handle_new_user (auto-profile on sign-up)
--             handle_updated_at (auto-timestamp)
-- RLS:        Unified, conflict-free policies
-- Storage:    food-images bucket — public read, auth write
-- ============================================================
