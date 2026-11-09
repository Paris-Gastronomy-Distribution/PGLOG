-- =============================================================================
-- Catalogues digitaux — schéma Supabase
-- À exécuter dans Supabase > SQL Editor > New query > Run.
-- Le script est idempotent : on peut le relancer sans casser l'existant.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Table `catalogs`
-- -----------------------------------------------------------------------------
create table if not exists public.catalogs (
  id             uuid        primary key default gen_random_uuid(),

  -- Identifiant d'URL : /c/{slug}. Minuscules, chiffres et tirets uniquement.
  slug           text        not null unique
                             check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),

  title          text        not null check (char_length(title) between 1 and 200),
  description    text,

  -- Nombre de pages rendues (fichiers {slug}/page-001.webp … page-NNN.webp).
  page_count     int         not null default 0 check (page_count >= 0),

  -- Dimensions en pixels des pages rendues (largeur cible 1600 px).
  -- Permettent au viewer de dimensionner le livre avant le chargement des images.
  page_width     int         check (page_width  > 0),
  page_height    int         check (page_height > 0),

  -- Miniature 400 px de la couverture (liste de l'admin).
  cover_url      text,

  -- Couleur d'accent des contrôles du viewer, format #RRGGBB.
  accent_color   text        not null default '#111111'
                             check (accent_color ~ '^#[0-9a-fA-F]{6}$'),

  -- Si true ET pdf_url renseigné : bouton « Télécharger le PDF » dans le viewer.
  allow_download boolean     not null default false,
  pdf_url        text,

  created_at     timestamptz not null default now()
);

-- Colonnes ajoutées après coup : sans effet si elles existent déjà.
alter table public.catalogs add column if not exists page_width  int;
alter table public.catalogs add column if not exists page_height int;

create index if not exists catalogs_created_at_idx on public.catalogs (created_at desc);

comment on table  public.catalogs              is 'Catalogues digitaux (flipbooks) publiés sur /c/{slug}.';
comment on column public.catalogs.page_width   is 'Largeur en px des pages rendues (WebP).';
comment on column public.catalogs.page_height  is 'Hauteur en px des pages rendues (WebP).';


-- -----------------------------------------------------------------------------
-- 2. Row Level Security
-- -----------------------------------------------------------------------------
-- RLS activée et AUCUNE policy pour les rôles `anon` / `authenticated` :
--   - la clé anon (publique, présente dans le navigateur) ne peut ni lire,
--     ni lister, ni modifier les catalogues ;
--   - personne ne peut donc énumérer vos catalogues : un lien /c/{slug}
--     n'est connu que des personnes à qui vous l'envoyez ;
--   - le site lit et écrit côté serveur avec la clé `service_role`, qui
--     contourne la RLS et n'est jamais envoyée au navigateur.
alter table public.catalogs enable row level security;

-- Nettoyage d'éventuelles policies trop permissives créées à la main.
drop policy if exists "Public read catalogs"   on public.catalogs;
drop policy if exists "Enable read access for all users" on public.catalogs;

-- Ceinture et bretelles : retirer les droits directs des rôles publics.
revoke all on table public.catalogs from anon, authenticated;

-- Le serveur (clé service_role) doit pouvoir lire et écrire, même si l'option
-- « Automatically expose new tables » a été décochée à la création du projet.
grant select, insert, update, delete on table public.catalogs to service_role;


-- -----------------------------------------------------------------------------
-- 3. Bucket Storage `catalogs`
-- -----------------------------------------------------------------------------
-- Bucket PUBLIC : chaque fichier est lisible via son URL publique
--   https://<projet>.supabase.co/storage/v1/object/public/catalogs/{slug}/page-001.webp
-- (c'est ce que charge le viewer, sans authentification).
--
-- Arborescence d'un catalogue :
--   {slug}/page-001.webp … page-NNN.webp   pages, 1600 px de large, WebP q0.82
--   {slug}/cover.webp                      miniature 400 px (liste admin)
--   {slug}/og.jpg                          aperçu 1200×630 (WhatsApp, LinkedIn, mail)
--   {slug}/{slug}.pdf                      PDF original (si téléchargement autorisé)
--
-- Limite : 50 Mo par fichier (= plafond du plan gratuit Supabase).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalogs',
  'catalogs',
  true,
  52428800,
  array['image/webp', 'image/jpeg', 'application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- -----------------------------------------------------------------------------
-- 4. Policies Storage
-- -----------------------------------------------------------------------------
-- Volontairement AUCUNE policy sur storage.objects pour `anon` :
--   - lecture : un bucket public sert ses fichiers par URL publique SANS policy ;
--     ne PAS ajouter de policy SELECT, sinon n'importe qui pourrait LISTER
--     le contenu du bucket (et découvrir tous les slugs) via l'API ;
--   - écriture : l'admin envoie les fichiers depuis le navigateur grâce à des
--     « signed upload URLs » générées côté serveur (clé service_role) après
--     vérification du mot de passe admin. Aucune policy INSERT n'est nécessaire,
--     et la clé anon seule ne permet aucun upload ;
--   - suppression : faite côté serveur avec la clé service_role.
--
-- Nettoyage d'éventuelles policies trop permissives créées depuis le dashboard :
drop policy if exists "Public read catalogs"   on storage.objects;
drop policy if exists "Public upload catalogs" on storage.objects;
drop policy if exists "Public delete catalogs" on storage.objects;


-- -----------------------------------------------------------------------------
-- 5. Vérifications (optionnel — à lancer séparément)
-- -----------------------------------------------------------------------------
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'catalogs';
-- select policyname, roles, cmd from pg_policies where schemaname = 'public'  and tablename = 'catalogs';
-- select policyname, roles, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects';
