-- ===================================================================
--  « Nous » — passage à l'authentification
--
--  À lancer APRÈS schema.sql, dans : Supabase > SQL Editor > New query.
--
--  Avant de lancer ce script, créez vos deux comptes :
--    Authentication > Users > Add user > Create new user
--    (cochez « Auto Confirm User » : il n'y a pas d'envoi d'e-mail ici)
--
--  ⚠️ On se connecte au site par un SURNOM, pas par une adresse. Créez
--     donc les comptes avec l'adresse technique correspondante :
--       « Doudou »   -> doudou@nous.local
--       « Ma Puce »  -> mapuce@nous.local
--       « Mon Cœur » -> moncoeur@nous.local
--     (on ne garde que les lettres et les chiffres)
--
--  ⚠️ Une fois ce script passé, plus personne ne peut lire ni écrire
--     sans être connecté — y compris vous. Créez les comptes d'abord.
-- ===================================================================

-- -------------------------------------------------------------------
-- 1. Les données : réservées aux comptes connectés
--
-- On remplace les policies ouvertes de schema.sql. `auth.uid()` vaut
-- l'identifiant de l'utilisateur connecté, et NULL pour un visiteur
-- anonyme muni de la seule clé publique — qui n'a donc plus accès.
-- -------------------------------------------------------------------

alter table public.items enable row level security;

drop policy if exists "espace partagé : lecture"     on public.items;
drop policy if exists "espace partagé : insertion"   on public.items;
drop policy if exists "espace partagé : mise à jour" on public.items;
drop policy if exists "espace partagé : suppression" on public.items;
drop policy if exists "membres : tout"               on public.items;

create policy "membres : tout"
  on public.items
  for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- -------------------------------------------------------------------
-- 2. Les photos : bucket privé + accès réservé
--
-- Le bucket passe en privé : plus aucune URL publique ne fonctionne.
-- L'application demande désormais des URLs signées, valables 4 h, que
-- seul un compte connecté peut obtenir.
-- -------------------------------------------------------------------

update storage.buckets set public = false where id = 'media';

drop policy if exists "media : lecture"     on storage.objects;
drop policy if exists "media : envoi"       on storage.objects;
drop policy if exists "media : suppression" on storage.objects;
drop policy if exists "media : membres"     on storage.objects;

create policy "media : membres"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'media' and auth.uid() is not null)
  with check (bucket_id = 'media' and auth.uid() is not null);

-- -------------------------------------------------------------------
-- 3. Vérification
--
-- Attendu :
--   items_ouvert_a_anon = false      (plus rien pour les non-connectés)
--   bucket_prive        = true
--   policies_items      = 1
--   policies_media      = 1
-- -------------------------------------------------------------------

select
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'items'
      and ('anon' = any(roles) or roles = '{public}')
  )                                                                    as items_ouvert_a_anon,
  (select not public from storage.buckets where id = 'media')          as bucket_prive,
  (select count(*) from pg_policies
     where schemaname = 'public' and tablename = 'items')              as policies_items,
  (select count(*) from pg_policies
     where schemaname = 'storage' and tablename = 'objects'
       and policyname = 'media : membres')                             as policies_media;

-- ===================================================================
--  REVENIR EN ARRIÈRE (si jamais vous vous verrouillez dehors)
--
--  Rejouez la section 3 de schema.sql, puis :
--    update storage.buckets set public = true where id = 'media';
--
--  Mais le plus simple reste de réinitialiser le mot de passe depuis
--  Authentication > Users > (les trois points) > Reset password.
-- ===================================================================
