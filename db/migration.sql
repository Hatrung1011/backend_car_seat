-- Supabase Migration: Create products table
-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  age_range TEXT NOT NULL,
  weight TEXT NOT NULL,
  price TEXT NOT NULL,
  badge TEXT,
  badge_type TEXT,
  colors JSONB NOT NULL DEFAULT '[]',
  images JSONB NOT NULL DEFAULT '[]',
  category TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  highlights JSONB NOT NULL DEFAULT '[]',
  specs JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (optional, since we use service_role key)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role (bypasses RLS by default)
-- For public read access (if you later want the frontend to read directly):
CREATE POLICY "Allow public read" ON products
  FOR SELECT USING (true);

-- Index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);

-- Index on category for filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
