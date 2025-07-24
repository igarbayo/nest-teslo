CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY key DEFAULT gen_random_uuid(),
  title TEXT UNIQUE NOT NULL,
  price NUMERIC DEFAULT 0 NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  stock NUMERIC DEFAULT 0 NOT NULL,
  sizes TEXT[] NOT NULL,
  gender TEXT NOT null,
  tags TEXT[]
);

CREATE TABLE IF NOT EXISTS products_images (
  id UUID PRIMARY key DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL
);