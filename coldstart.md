# Coldstart Context — SelfTrain

## 1. Project Overview

**SelfTrain** adalah _mobile-first web app_ (tetapi tetap responsif di desktop) yang dirancang untuk membantu mahasiswa dan pekerja sibuk mencatat _workout set/reps_ serta asupan kalori harian secara cepat (_zero-friction_). Aplikasi ini difokuskan untuk pengguna yang latihan mandiri di rumah atau gym tanpa Personal Trainer (PT).

## 2. Tech Stack & Infrastructure

- **Framework:** Next.js (React + TypeScript)
- **Styling & UI:** Tailwind CSS, Lucide Icons, Shadcn UI
- **Database & Auth:** Supabase (PostgreSQL, Supabase Auth untuk Google Login, Row Level Security Enabled)
- **State Management:** React Hooks + LocalStorage Persistence Sync
- **Deployment:** Vercel

## 3. Database Schema (Supabase)

```sql
-- Profiles / Users Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  target_calories INT DEFAULT 2000,
  target_protein INT DEFAULT 120,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout Logs Table
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  weight_kg NUMERIC NOT NULL,
  reps INT NOT NULL,
  set_number INT NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nutrition Logs Table
CREATE TABLE public.nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calories INT NOT NULL,
  protein_g INT DEFAULT 0,
  carbs_g INT DEFAULT 0,
  fat_g INT DEFAULT 0,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);
```
