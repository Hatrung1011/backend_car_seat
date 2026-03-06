-- ===== Brands Table =====
CREATE TABLE IF NOT EXISTS brands (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read brands" ON brands FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands (slug);

-- ===== Categories Table =====
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read categories" ON categories FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);

-- ===== Seed Default Brands =====
INSERT INTO brands (name, slug, description, sort_order) VALUES
  ('Nhật Hạ Platinum', 'nhat-ha-platinum', 'Dòng sản phẩm cao cấp nhất', 1),
  ('Nhật Hạ Gold', 'nhat-ha-gold', 'Dòng sản phẩm phổ thông', 2)
ON CONFLICT (name) DO NOTHING;

-- ===== Seed Default Categories =====
INSERT INTO categories (name, slug, description, sort_order) VALUES
  ('Sơ sinh (Infant)', 'infant', 'Ghế dành cho trẻ sơ sinh 0-12 tháng', 1),
  ('Trẻ nhỏ (Toddler)', 'toddler', 'Ghế dành cho trẻ nhỏ 1-4 tuổi', 2),
  ('Trẻ lớn (Child)', 'child', 'Ghế dành cho trẻ lớn 4-12 tuổi', 3)
ON CONFLICT (name) DO NOTHING;
