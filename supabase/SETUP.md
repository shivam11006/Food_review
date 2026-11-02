# Supabase Setup Guide for FoodReview Platform

## Step 1 — Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose your organisation, enter a project name (e.g. `food-review`), set a strong database password, and select a region close to you.
4. Wait ~2 minutes for the project to finish provisioning.

---

## Step 2 — Run the Database Schema

1. In the Supabase dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the file [`supabase/schema.sql`](./schema.sql) in this project.
4. Copy the **entire** contents and paste it into the SQL Editor.
5. Click **Run** (or press `Ctrl+Enter`).
6. You should see `Success. No rows returned` — this means all tables, triggers, and RLS policies were created.

---

## Step 3 — Get Your API Keys

1. In the sidebar, go to **Project Settings → API**.
2. Copy:
   - **Project URL** → paste as `VITE_SUPABASE_URL` in your `.env` file
   - **anon public key** → paste as `VITE_SUPABASE_ANON_KEY` in your `.env` file

Your `.env` file should look like:

```dotenv
VITE_SUPABASE_URL=https://abcdefghij.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
VITE_APP_NAME=FoodReview
VITE_APP_URL=http://localhost:5173
```

---

## Step 4 — Configure Authentication

1. Go to **Authentication → Providers** and make sure **Email** is enabled.
2. Go to **Authentication → URL Configuration** and set:
   - **Site URL**: `http://localhost:5173` (for dev) or your production domain
   - **Redirect URLs**: add `http://localhost:5173/**` and your production domain

---

## Step 5 — Verify Storage

The SQL script creates a `food-images` storage bucket automatically.  
To verify:

1. Go to **Storage** in the sidebar.
2. You should see a bucket called **food-images** with **Public** access.

If not, create it manually:
- Name: `food-images`
- Public bucket: ✅ (enabled)

---

## Step 6 — Restart the Dev Server

After updating `.env`:

```bash
# Stop the server (Ctrl+C) then:
npm run dev
```

The app will be live at **http://localhost:5173**

---

## Database Schema Overview

| Table | Purpose |
|-------|---------|
| `profiles` | Organizer accounts linked to `auth.users` |
| `parties` | Events created by organizers |
| `food_items` | Dishes associated with each party |
| `reviews` | Guest ratings and feedback per dish |

## RLS Policy Summary

| Table | Who can read | Who can write |
|-------|-------------|---------------|
| `profiles` | Public (for organizer names) | Owner only |
| `parties` | Public (active only) | Organizer (own) |
| `food_items` | Public (active parties) | Organizer (own parties) |
| `reviews` | Public | Guests (insert), Organizer (delete) |
| `storage` | Public | Authenticated only |
