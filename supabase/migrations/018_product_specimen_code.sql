-- Optional editorial code shown as "No. …" on strain science card
alter table public.products
  add column if not exists specimen_code text;

comment on column public.products.specimen_code is 'Optional catalog/specimen label for product card (e.g. B2C3). Falls back to slug-derived label when null.';
