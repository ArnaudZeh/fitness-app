-- P9c — Photos de progression : premier bucket Supabase Storage de ce
-- projet. Privé (public = false) — l'accès passe par des URLs signées
-- générées côté client après vérification RLS, jamais une URL publique
-- fixe. Convention de chemin : "<user_id>/<uuid>.jpg" — le premier segment
-- sert de propriétaire pour les policies RLS ci-dessous.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  5242880, -- 5 Mo — la compression côté client vise très en-dessous, marge de sécurité
  array['image/jpeg', 'image/png', 'image/webp']
);

-- Même règle de visibilité que milestones/public_profiles : soi-même, ou
-- un utilisateur ayant activé social_sharing_enabled. (storage.foldername
-- (name))[1] extrait le premier segment du chemin ("<user_id>/...").
create policy "Users can upload their own progress photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view their own progress photos and opted-in others'"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.public_profiles pp
        where pp.id::text = (storage.foldername(name))[1]
      )
    )
  );

create policy "Users can delete their own progress photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- storage_path est la source de vérité du fichier ; caption/photo_date
-- vivent ici plutôt que dans les métadonnées Storage pour rester
-- cohérent avec le reste du modèle (RLS identique à milestones, tri par
-- date facile). Pas de policy update — une correction se fait par
-- suppression + réupload, comme les autres jalons du feed.
create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  caption text,
  photo_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.progress_photos enable row level security;

create policy "Users can view their own progress photos and opted-in others'"
  on public.progress_photos for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.public_profiles pp
      where pp.id = progress_photos.user_id
    )
  );

create policy "Users can insert their own progress photos"
  on public.progress_photos for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own progress photos"
  on public.progress_photos for delete
  to authenticated
  using (auth.uid() = user_id);

create index progress_photos_user_id_photo_date_idx
  on public.progress_photos (user_id, photo_date desc);
