create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  paid_content text not null,
  category text not null,
  image_url text,
  price_base_units numeric not null check (price_base_units > 0),
  currency text not null check (currency in ('STX', 'SBTC')),
  seller_wallet text not null,
  is_listed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists prompts_set_updated_at on public.prompts;
create trigger prompts_set_updated_at
before update on public.prompts
for each row
execute function public.set_updated_at();

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts(id) on delete cascade,
  buyer_wallet text not null,
  currency text not null check (currency in ('STX', 'SBTC')),
  amount_base_units numeric not null check (amount_base_units > 0),
  payment_tx text,
  created_at timestamptz not null default now()
);

create index if not exists idx_prompts_listed_created_at
  on public.prompts (is_listed, created_at desc);

create index if not exists idx_prompts_seller_wallet
  on public.prompts (seller_wallet);

create index if not exists idx_purchases_prompt_buyer
  on public.purchases (prompt_id, buyer_wallet);

alter table public.prompts enable row level security;
alter table public.purchases enable row level security;

revoke all on table public.prompts from anon, authenticated;
revoke all on table public.purchases from anon, authenticated;

grant select (
  id,
  title,
  description,
  category,
  image_url,
  price_base_units,
  currency,
  seller_wallet,
  is_listed,
  created_at,
  updated_at
) on public.prompts to anon, authenticated;

drop policy if exists prompts_public_read_listed_metadata on public.prompts;
create policy prompts_public_read_listed_metadata
  on public.prompts
  for select
  to anon, authenticated
  using (is_listed = true);
