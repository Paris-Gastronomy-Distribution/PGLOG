# PGLOG — Catalogues digitaux

Vous créez un catalogue sur Canva, vous l'exportez en PDF et vous l'envoyez ici. Vous obtenez un lien propre (`https://votre-domaine.fr/c/mon-catalogue`) qui ouvre un livre feuilletable, sans watermark ni mention de la plateforme.

- **100 % gratuit** : Vercel (plan Hobby) + Supabase (plan Free). Aucune API payante.
- **Conversion dans le navigateur** : le PDF est découpé en images WebP par votre navigateur (pdf.js) au moment de l'upload. Le serveur ne fait aucun calcul lourd et les clients ne téléchargent jamais le PDF pour feuilleter.
- **Aperçu soigné** : titre, description et image de couverture apparaissent quand le lien est collé dans WhatsApp, LinkedIn ou un mail.

> **Avancement**
> ✅ Étape 1 : schéma Supabase et documentation
> ⏳ Étape 2 : viewer `/c/[slug]` avec un catalogue de démonstration (`/c/demo`)
> ⏳ Étape 3 : page `/admin` (upload et conversion des PDF)
> ⏳ Étape 4 : authentification et nettoyage

---

## Sommaire

1. [Prérequis](#1-prérequis)
2. [Créer le projet Supabase](#2-créer-le-projet-supabase)
3. [Créer la table, le bucket et les règles de sécurité](#3-créer-la-table-le-bucket-et-les-règles-de-sécurité)
4. [Récupérer les clés Supabase](#4-récupérer-les-clés-supabase)
5. [Lancer le projet en local](#5-lancer-le-projet-en-local)
6. [Déployer sur Vercel](#6-déployer-sur-vercel)
7. [Brancher un domaine personnalisé](#7-brancher-un-domaine-personnalisé)
8. [Utilisation au quotidien](#8-utilisation-au-quotidien)
9. [Limites du gratuit](#9-limites-du-gratuit)
10. [Architecture et sécurité](#10-architecture-et-sécurité)

---

## 1. Prérequis

1. Un compte **GitHub** qui contient ce dépôt.
2. Un compte **Supabase** gratuit : <https://supabase.com> → *Start your project* (connexion possible avec GitHub).
3. Un compte **Vercel** gratuit : <https://vercel.com/signup> → *Continue with GitHub*.
4. Pour travailler en local (facultatif) : **Node.js 20 ou plus récent** (<https://nodejs.org>, version LTS).
5. Pour l'upload des catalogues : **Chrome, Edge ou Firefox** récent sur ordinateur. Safari ne sait pas encoder les images en WebP.

## 2. Créer le projet Supabase

1. Ouvrez <https://supabase.com/dashboard> et cliquez sur **New project**.
2. **Organization** : votre organisation (créée automatiquement au premier login).
3. **Project name** : par exemple `catalogues`.
4. **Database password** : cliquez sur *Generate a password* et conservez-le dans votre gestionnaire de mots de passe. Le site ne l'utilise pas, mais Supabase peut vous le redemander.
5. **Region** : **West EU (Paris)** (`eu-west-3`), la plus proche de vos clients.
6. **Plan** : *Free*.
7. Cliquez sur **Create new project** et attendez 1 à 2 minutes que le projet soit prêt.

## 3. Créer la table, le bucket et les règles de sécurité

1. Dans le menu de gauche du projet, ouvrez **SQL Editor**.
2. Cliquez sur **New query** (ou le bouton **+**).
3. Ouvrez le fichier [`supabase/schema.sql`](supabase/schema.sql) de ce dépôt, copiez **tout** son contenu et collez-le dans l'éditeur.
4. Cliquez sur **Run** (ou `Ctrl + Entrée`). Le message attendu est *Success. No rows returned*.
5. Vérifiez la table : menu **Table Editor** → la table `catalogs` apparaît, avec le badge **RLS enabled**.
6. Vérifiez le bucket : menu **Storage** → le bucket `catalogs` apparaît avec le badge **Public**.
7. Vérifiez les policies : menu **Storage** → **Policies** → le bucket `catalogs` n'a **aucune** policy. C'est voulu :
   - la lecture des images passe par leur URL publique, sans policy ;
   - les uploads passent par des URLs signées générées par le serveur ;
   - sans policy de lecture, personne ne peut lister le contenu du bucket.
8. Si vous relancez le script plus tard (après une mise à jour du projet, par exemple), il ne casse rien : il est idempotent.

## 4. Récupérer les clés Supabase

1. Ouvrez **Project Settings** (roue crantée en bas à gauche).
2. Section **Data API** (ou **API**) : copiez la **Project URL**. Elle va dans `NEXT_PUBLIC_SUPABASE_URL`.
3. Section **API Keys** :
   - la clé **`anon`** (onglet *Legacy API keys*) ou la clé **Publishable** (`sb_publishable_…`) va dans `NEXT_PUBLIC_SUPABASE_ANON_KEY` ;
   - la clé **`service_role`** (onglet *Legacy API keys*, bouton *Reveal*) ou une clé **Secret** (`sb_secret_…`) va dans `SUPABASE_SERVICE_ROLE_KEY`.
4. ⚠️ La clé `service_role`/`secret` donne un accès total. Ne la partagez jamais, ne la mettez jamais dans une variable préfixée `NEXT_PUBLIC_` et ne la committez jamais.

## 5. Lancer le projet en local

1. Clonez le dépôt et installez les dépendances :
   ```bash
   git clone https://github.com/belou16/PGLOG.git
   cd PGLOG
   npm install
   ```
2. Copiez le modèle de configuration :
   ```bash
   cp .env.example .env.local
   ```
   Sous Windows (PowerShell) : `Copy-Item .env.example .env.local`
3. Ouvrez `.env.local` et remplissez les variables (les commentaires du fichier indiquent où trouver chaque valeur) :

   | Variable | Obligatoire | Rôle |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | oui | URL du projet Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | oui | Clé publique (uploads signés depuis le navigateur) |
   | `SUPABASE_SERVICE_ROLE_KEY` | oui | Clé secrète, utilisée uniquement côté serveur |
   | `ADMIN_PASSWORD` | oui | Mot de passe de `/admin` (16 caractères minimum conseillés) |
   | `NEXT_PUBLIC_SITE_URL` | non | URL publique du site, pour les liens absolus |
   | `CRON_SECRET` | non | Protège le cron quotidien qui garde Supabase actif |

4. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
5. Ouvrez <http://localhost:3000/c/demo> : le catalogue de démonstration s'affiche (il fonctionne même sans Supabase).
6. Ouvrez <http://localhost:3000/admin> pour publier un vrai catalogue (disponible à partir de l'étape 3).

## 6. Déployer sur Vercel

1. Poussez votre code sur GitHub (branche `main`).
2. Sur <https://vercel.com/new>, cliquez sur **Import** en face du dépôt `PGLOG`. Si le dépôt n'apparaît pas, cliquez sur *Adjust GitHub App Permissions* et donnez l'accès au dépôt.
3. **Framework Preset** : *Next.js* (détecté automatiquement). Ne modifiez ni *Root Directory* ni les commandes de build.
4. Dépliez **Environment Variables** et ajoutez une à une les variables de votre `.env.local` (même nom, même valeur). Pour `NEXT_PUBLIC_SITE_URL`, laissez vide pour l'instant ou mettez l'URL définitive si vous la connaissez.
5. Cliquez sur **Deploy** et attendez la fin du build (1 à 2 minutes).
6. Vercel affiche l'URL du site (`https://pglog-xxxx.vercel.app`). Ouvrez `https://…/c/demo` pour vérifier.
7. Les déploiements suivants sont automatiques : chaque `git push` sur `main` redéploie le site.
8. Si vous modifiez une variable d'environnement plus tard : **Project → Settings → Environment Variables**, puis **Deployments → ⋯ → Redeploy** pour qu'elle soit prise en compte.

## 7. Brancher un domaine personnalisé

Exemple avec `catalogues.mondomaine.fr`. Un sous-domaine est recommandé : il ne touche pas au site principal.

1. Dans Vercel : **Project → Settings → Domains**.
2. Saisissez `catalogues.mondomaine.fr` puis cliquez sur **Add**.
3. Vercel affiche l'enregistrement DNS à créer, en général :
   - pour un **sous-domaine** : un enregistrement **CNAME**, nom `catalogues`, valeur indiquée par Vercel (par exemple `cname.vercel-dns.com` ou une valeur propre à votre projet) ;
   - pour un **domaine racine** (`mondomaine.fr`) : un enregistrement **A**, nom `@`, valeur indiquée par Vercel (par exemple `76.76.21.21`).

   Recopiez **exactement** les valeurs affichées par Vercel.
4. Chez votre registrar (OVHcloud, Gandi, IONOS…), ouvrez la **zone DNS** du domaine et ajoutez cet enregistrement. Chez OVHcloud : *Web Cloud → Noms de domaine → votre domaine → Zone DNS → Ajouter une entrée*.
5. Attendez la propagation (de quelques minutes à quelques heures). Dans Vercel, le domaine passe à **Valid Configuration** et le certificat HTTPS est créé automatiquement (gratuit).
6. Dans **Settings → Environment Variables**, renseignez `NEXT_PUBLIC_SITE_URL=https://catalogues.mondomaine.fr` puis redéployez (étape 6.8).
7. Testez l'aperçu d'un lien en le collant dans WhatsApp ou LinkedIn. Pour LinkedIn, le *Post Inspector* (<https://www.linkedin.com/post-inspector/>) force le rafraîchissement de l'aperçu.

## 8. Utilisation au quotidien

> Disponible à partir des étapes 3 et 4.

1. **Sur Canva** : *Partager → Télécharger → PDF Standard* (ou *PDF Impression*). Le poids maximum est de 50 Mo.
2. Ouvrez `https://votre-domaine/admin` et saisissez le mot de passe (`ADMIN_PASSWORD`).
3. Renseignez le **titre**. Le **slug** (la fin du lien) se remplit tout seul et reste modifiable.
4. Ajoutez une **description** facultative (elle apparaît dans l'aperçu WhatsApp/LinkedIn) et choisissez une **couleur d'accent**.
5. Cochez **Autoriser le téléchargement du PDF** si vos clients doivent pouvoir récupérer le fichier original.
6. Déposez le PDF dans la zone prévue. La barre de progression indique la page en cours (« page 7/24 »). **Gardez l'onglet ouvert** jusqu'à la fin.
7. Cliquez sur **Copier le lien** et envoyez-le à vos clients.
8. Pour retirer un catalogue, cliquez sur **Supprimer** : la fiche et tous ses fichiers sont effacés.

## 9. Limites du gratuit

| Service | Limite (plan gratuit) | Ce que ça représente |
|---|---|---|
| Supabase Storage | 1 Go de stockage | ~150 à 300 catalogues de 24 pages sans PDF. Un PDF stocké pour téléchargement peut peser jusqu'à 50 Mo. |
| Supabase Storage | 50 Mo max par fichier | Taille maximale d'un PDF |
| Supabase egress | 5 Go/mois | ~1 000 à 2 000 lectures complètes d'un catalogue de 24 pages. Le chargement progressif ne télécharge que les pages réellement feuilletées. |
| Supabase | **Pause après 7 jours sans activité** | Un cron Vercel quotidien (étape 4) interroge la base pour éviter la pause. Si le projet est quand même en pause : dashboard Supabase → *Restore project*. |
| Vercel Hobby | 100 Go de bande passante/mois | Largement suffisant : les images sont servies par Supabase. |

⚠️ **Conditions d'utilisation de Vercel** : le plan Hobby est réservé à un usage **personnel et non commercial**. Pour un usage professionnel strict, Vercel demande le plan Pro. L'alternative gratuite qui autorise l'usage commercial est Cloudflare Workers (avec OpenNext), qui demande quelques adaptations.

## 10. Architecture et sécurité

```
Canva ─PDF─▶ /admin (navigateur)
               │ pdf.js : chaque page → <canvas> 1600 px → WebP 0.82
               │ + miniature 400 px + aperçu og.jpg 1200×630
               ▼
        URLs d'upload signées (générées par le serveur après vérif. du mot de passe)
               ▼
        Supabase Storage  catalogs/{slug}/page-001.webp …
        Supabase Postgres table catalogs
               ▼
        /c/{slug} : le viewer charge uniquement des images légères (StPageFlip)
```

- **Stack** : Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase · pdfjs-dist · page-flip (StPageFlip).
- **Lecture des catalogues** : côté serveur, avec la clé `service_role`. La table est protégée par la RLS sans aucune policy publique, donc la clé anon ne permet pas de lister les catalogues. Un lien n'est connu que de ceux qui le reçoivent.
- **Indexation** : les pages catalogue sont marquées `noindex` et n'apparaissent pas dans Google.
- **Images** : servies directement par Supabase (`<img>`), sans passer par l'optimiseur d'images de Vercel, ce qui évite ses quotas.
- **Catalogue de démonstration** : `/c/demo` est servi depuis `public/demo/`. Les fichiers sont générés par `node scripts/generate-demo.mjs`.

### Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement sur <http://localhost:3000> |
| `npm run build` | Build de production (identique à Vercel) |
| `npm run start` | Lance le build de production en local |
| `npm run lint` | Vérification ESLint |
| `node scripts/generate-demo.mjs` | Régénère le catalogue de démonstration |
