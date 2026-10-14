-- ============================================================
-- Migration 037: Seed Forbidden Orange (Thailand Expedition)
-- (Mimosa x Tangie) x Forbidden #666 — feminized, 8–9 wks, 22–26% THC
-- ============================================================

-- 1. Product
INSERT INTO products (
  id,
  slug,
  price_cents,
  stock,
  images,
  active,
  is_featured,
  category_id,
  seed_type,
  flowering_weeks_min,
  flowering_weeks_max,
  thc_min,
  thc_max,
  cbd_min,
  cbd_max,
  genetics,
  parent_mother,
  parent_father,
  hero_video_url,
  hero_poster_url,
  hero_frame_count
) VALUES (
  'b2c3d4e5-2222-4000-a000-000000000002',
  'forbidden-orange-coruja-seeds',
  4000,  -- display price = min variant ($40 USD)
  100,   -- total stock across variants
  ARRAY[
    '/images/forbidden-orange/forbidden.png',
    '/videos/forbiddenorange.mp4'
  ],
  true,
  true,  -- is_featured: enables the immersive scrollytelling landing
  'a1b2c3d4-1111-4000-a000-000000000001', -- thailand-expedition
  'feminized',
  8,
  9,
  22,
  26,
  0,
  1,
  '(Mimosa x Tangie) x Forbidden #666',
  'Forbidden #666',
  'Mimosa x Tangie',
  '/images/forbidden-orange/frames/frame_',
  '/images/forbidden-orange/forbidden.png',
  60  -- frame count from ffmpeg extraction (24fps × 2.5s)
);

-- 2. Translations
INSERT INTO product_translations (product_id, locale, name, description) VALUES
  (
    'b2c3d4e5-2222-4000-a000-000000000002',
    'pt',
    'Forbidden Orange - Coruja Seeds (Feminizada)',
    E'O cítrico dourado da Thailand Expedition.\n\n' ||
    E'A Forbidden Orange é uma genética de coleção desenvolvida para quem busca o ápice do perfil aromático frutado. ' ||
    E'Nascida do cruzamento primoroso entre uma base cítrica lendária (Mimosa x Tangie) e a absurda produção de resina do nosso corte exclusivo Forbidden #666, ' ||
    E'essa planta entrega uma experiência sensorial luminosa e sofisticada.\n\n' ||
    E'Esqueça o cítrico agressivo ou ácido: a Forbidden Orange foi lapidada para entregar um perfil soft. ' ||
    E'No nariz, ela exala um perfume inconfundível de laranjas maduras e flores brancas delicadas. ' ||
    E'No paladar, a fumaça ou vapor revela um sabor exato de "bala de goma de tangerina" — doce e aveludada na entrada, ' ||
    E'com um frescor cítrico muito suave que perdura no final.\n\n' ||
    E'Seus efeitos acompanham a leveza do seu sabor. A jornada começa com uma elevação mental clara e criativa, ' ||
    E'ideal para o dia a dia ou momentos de inspiração, e evolui de forma fluida para um relaxamento corporal limpo e confortável, sem pesar.'
  ),
  (
    'b2c3d4e5-2222-4000-a000-000000000002',
    'en',
    'Forbidden Orange - Coruja Seeds (Feminized)',
    E'The golden citrus of the Thailand Expedition.\n\n' ||
    E'Forbidden Orange is a collector-grade genetic engineered for those chasing the peak of the fruity aromatic profile. ' ||
    E'Born from the careful cross of a legendary citrus base (Mimosa x Tangie) and the absurd resin production of our exclusive Forbidden #666 cut, ' ||
    E'this plant delivers a luminous, sophisticated sensory experience.\n\n' ||
    E'Forget aggressive or acidic citrus: Forbidden Orange was refined for a soft profile. ' ||
    E'On the nose, an unmistakable perfume of ripe oranges and delicate white flowers. ' ||
    E'On the palate, smoke or vapor reveals a true "tangerine gummy candy" flavor — sweet and velvety up front, ' ||
    E'with a very subtle citrus freshness that lingers on the finish.\n\n' ||
    E'Its effects match the lightness of its flavor. The journey begins with a clear, creative mental lift, ' ||
    E'ideal for everyday use or moments of inspiration, and evolves fluidly into a clean, comfortable body relaxation that never weighs you down.'
  ),
  (
    'b2c3d4e5-2222-4000-a000-000000000002',
    'es',
    'Forbidden Orange - Coruja Seeds (Feminizada)',
    E'El cítrico dorado de la Thailand Expedition.\n\n' ||
    E'Forbidden Orange es una genética de colección desarrollada para quienes buscan el ápice del perfil aromático afrutado. ' ||
    E'Nacida del cruce primoroso entre una base cítrica legendaria (Mimosa x Tangie) y la absurda producción de resina de nuestro corte exclusivo Forbidden #666, ' ||
    E'esta planta entrega una experiencia sensorial luminosa y sofisticada.\n\n' ||
    E'Olvida el cítrico agresivo o ácido: la Forbidden Orange fue pulida para ofrecer un perfil soft. ' ||
    E'En nariz, exhala un perfume inconfundible de naranjas maduras y flores blancas delicadas. ' ||
    E'En paladar, el humo o vapor revela un sabor exacto de "gomita de mandarina" — dulce y aterciopelada en la entrada, ' ||
    E'con un frescor cítrico muy suave que perdura al final.\n\n' ||
    E'Sus efectos acompañan la ligereza de su sabor. El viaje comienza con una elevación mental clara y creativa, ' ||
    E'ideal para el día a día o momentos de inspiración, y evoluciona de forma fluida hacia una relajación corporal limpia y cómoda, sin pesar.'
  );

-- 3. Variants
INSERT INTO product_variants (id, product_id, slug, seed_count, price_cents, shipping_cents, stock) VALUES
  (
    'c3d4e5f6-3333-4000-a000-000000000003',
    'b2c3d4e5-2222-4000-a000-000000000002',
    '3-seeds',
    3,
    4000,   -- $40.00 USD
    2000,   -- $20.00 USD shipping
    50
  ),
  (
    'c3d4e5f6-3333-4000-a000-000000000004',
    'b2c3d4e5-2222-4000-a000-000000000002',
    '10-seeds',
    10,
    10000,  -- $100.00 USD
    2000,   -- $20.00 USD shipping
    50
  );

-- 4. Terpene profile (slugs already seeded in migration 010)
INSERT INTO product_terpenes (product_id, terpene_id, is_dominant)
SELECT 'b2c3d4e5-2222-4000-a000-000000000002'::uuid, t.id, t.slug IN ('limonene', 'myrcene')
FROM terpenes t
WHERE t.slug IN ('limonene', 'myrcene', 'linalool', 'caryophyllene');
