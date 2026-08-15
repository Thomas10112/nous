-- ===================================================================
--  « Nous » — schéma Supabase
--
--  À lancer une seule fois dans : Supabase > SQL Editor > New query.
--  Copiez tout ce fichier, collez, cliquez sur RUN.
-- ===================================================================

-- -------------------------------------------------------------------
-- 1. La table unique
--
-- Tout le site tient dans cette table : chaque entrée (aventure, mot,
-- photo, élément de moodboard…) est une ligne { space, collection, id,
-- data }. Une seule table = une seule souscription temps réel, et
-- ajouter une rubrique plus tard ne demande aucune migration.
-- -------------------------------------------------------------------

create table if not exists public.items (
  space       text        not null,
  collection  text        not null,
  id          text        not null,
  data        jsonb       not null,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  primary key (space, collection, id)
);

create index if not exists items_space_idx on public.items (space);
create index if not exists items_space_collection_idx on public.items (space, collection);

-- -------------------------------------------------------------------
-- 2. Temps réel
--
-- REPLICA IDENTITY FULL : sans ça, une suppression n'envoie que la clé
-- primaire aux autres appareils. Avec, ils reçoivent la ligne complète
-- et peuvent retirer le bon élément sans tout recharger.
-- -------------------------------------------------------------------

alter table public.items replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'items'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;
end $$;

-- -------------------------------------------------------------------
-- 3. Accès
--
-- Version « site privé à deux », SANS authentification : n'importe qui
-- ayant l'adresse du site peut tout lire et tout écrire. La clé publique
-- et le VITE_SPACE_ID sont visibles dans le JavaScript du navigateur :
-- ils ne protègent rien. La seule barrière est que personne ne connaît
-- l'URL du site.
--
-- Acceptable tant que l'adresse ne circule pas. Dès que ce n'est plus
-- le cas, passez à la section « PLUS TARD » en bas de ce fichier.
--
-- >>> Quand vous voudrez ajouter une vraie authentification, il suffira
--     de remplacer les quatre policies ci-dessous par celles laissées
--     en commentaire tout en bas. Rien d'autre à changer dans le code.
-- -------------------------------------------------------------------

alter table public.items enable row level security;

drop policy if exists "espace partagé : lecture"     on public.items;
drop policy if exists "espace partagé : insertion"   on public.items;
drop policy if exists "espace partagé : mise à jour" on public.items;
drop policy if exists "espace partagé : suppression" on public.items;

create policy "espace partagé : lecture"     on public.items for select using (true);
create policy "espace partagé : insertion"   on public.items for insert with check (true);
create policy "espace partagé : mise à jour" on public.items for update using (true) with check (true);
create policy "espace partagé : suppression" on public.items for delete using (true);

-- -------------------------------------------------------------------
-- 4. Le stockage des photos
-- -------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media : lecture"     on storage.objects;
drop policy if exists "media : envoi"       on storage.objects;
drop policy if exists "media : suppression" on storage.objects;

create policy "media : lecture"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "media : envoi"
  on storage.objects for insert
  with check (bucket_id = 'media');

create policy "media : suppression"
  on storage.objects for delete
  using (bucket_id = 'media');

-- ===================================================================
--  PLUS TARD : passer à une vraie authentification
--
--  1. Activez le provider de votre choix (e-mail, Google…) dans
--     Authentication > Providers.
--  2. Créez vos deux comptes.
--  3. Remplacez les policies de la section 3 par celles-ci :
--
--     drop policy "espace partagé : lecture"     on public.items;
--     drop policy "espace partagé : insertion"   on public.items;
--     drop policy "espace partagé : mise à jour" on public.items;
--     drop policy "espace partagé : suppression" on public.items;
--
--     create policy "membres : tout"
--       on public.items for all
--       using (auth.uid() is not null)
--       with check (auth.uid() is not null);
--
--     -- et pour restreindre à vos deux comptes précisément :
--     -- using (auth.uid() in ('uuid-de-lune', 'uuid-de-lautre'))
--
--  4. Côté application : ajoutez un écran de connexion appelant
--     supabase.auth.signInWithPassword(). Le reste du code n'a pas
--     besoin d'être touché : CloudAdapter passe déjà par un client
--     Supabase qui gère la session automatiquement.
-- ===================================================================
