-- P4a: BYOK — chaque utilisateur fournit sa propre clé API pour les
-- providers IA (Anthropic, OpenAI) plutôt qu'une clé partagée côté app.
-- La clé n'est jamais stockée en clair : chiffrée via Supabase Vault
-- (pgsodium), déchiffrable uniquement par le service_role — donc
-- uniquement depuis les Edge Functions ai-key-*, jamais exposée au client
-- (conforme à la contrainte "zéro clé API en clair côté client" du brief).
create extension if not exists supabase_vault;

create table public.ai_provider_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('anthropic', 'openai')),
  vault_secret_id uuid not null references vault.secrets (id) on delete cascade,
  is_valid boolean not null default false,
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.ai_provider_keys enable row level security;

-- Lecture seule : vault_secret_id n'est qu'une référence opaque, pas la
-- clé elle-même — même exposée au client via cette policy, elle ne permet
-- aucun déchiffrement (vault.decrypted_secrets reste hors du schéma
-- PostgREST exposé, donc inatteignable par anon/authenticated).
create policy "Users can view their own AI provider keys"
  on public.ai_provider_keys for select
  to authenticated
  using (auth.uid() = user_id);

-- Volontairement pas de policy insert/update/delete pour "authenticated" :
-- ces écritures passent exclusivement par les Edge Functions (service_role),
-- qui gèrent le secret Vault associé de façon atomique en même temps que
-- la ligne. RLS refuse par défaut ce qui n'a pas de policy explicite.

create trigger set_ai_provider_keys_updated_at
  before update on public.ai_provider_keys
  for each row execute function public.set_updated_at();

create index ai_provider_keys_user_id_idx on public.ai_provider_keys (user_id);

-- Wrappers Vault exposés en RPC PostgREST, réservés au service_role
-- uniquement (jamais anon/authenticated) — permettent aux Edge Functions
-- d'appeler vault.* via supabase-js sans connexion Postgres directe (le
-- schéma vault n'est pas dans l'API PostgREST exposée : public uniquement).
create or replace function public.ai_vault_create_secret(p_secret text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return vault.create_secret(p_secret, p_name);
end;
$$;

create or replace function public.ai_vault_update_secret(p_id uuid, p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform vault.update_secret(p_id, p_secret);
end;
$$;

create or replace function public.ai_vault_read_secret(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where id = p_id;
  return v_secret;
end;
$$;

create or replace function public.ai_vault_delete_secret(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from vault.secrets where id = p_id;
end;
$$;

revoke all on function public.ai_vault_create_secret(text, text) from public, anon, authenticated;
revoke all on function public.ai_vault_update_secret(uuid, text) from public, anon, authenticated;
revoke all on function public.ai_vault_read_secret(uuid) from public, anon, authenticated;
revoke all on function public.ai_vault_delete_secret(uuid) from public, anon, authenticated;

grant execute on function public.ai_vault_create_secret(text, text) to service_role;
grant execute on function public.ai_vault_update_secret(uuid, text) to service_role;
grant execute on function public.ai_vault_read_secret(uuid) to service_role;
grant execute on function public.ai_vault_delete_secret(uuid) to service_role;
