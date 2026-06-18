-- GlennSales — Seed: GMC-selskaper
-- Kjør etter schema.sql.

insert into public.companies (name, short_name, color)
values
  ('GMC Maritime AS',         'GMC Maritime',         'bg-sky-100 text-sky-800'),
  ('GMC HVAC AS',             'GMC HVAC',             'bg-amber-100 text-amber-800'),
  ('GMC Yard AS',             'GMC Yard',             'bg-emerald-100 text-emerald-800'),
  ('GMC Lifting Solution AS', 'GMC Lifting Solution', 'bg-rose-100 text-rose-800'),
  ('GMC P&A AS',              'GMC P&A',              'bg-violet-100 text-violet-800'),
  ('GMC Marine Partner AS',   'GMC Marine Partner',   'bg-teal-100 text-teal-800'),
  ('GMC Hilleren AS',         'GMC Hilleren',         'bg-indigo-100 text-indigo-800')
on conflict (name) do nothing;
