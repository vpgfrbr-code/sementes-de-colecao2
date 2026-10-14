-- Migration 023: Add flavors field to products
-- Stores an array of flavor slugs (e.g. ["lemon", "citrus", "berry"])

ALTER TABLE products ADD COLUMN IF NOT EXISTS flavors TEXT[] DEFAULT '{}';
