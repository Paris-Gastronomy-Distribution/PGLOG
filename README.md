# PGLOG — Catalogues digitaux

Vous créez un catalogue sur Canva, vous l'exportez en PDF et vous l'envoyez ici. Vous obtenez un lien propre (`https://votre-domaine.fr/c/mon-catalogue`) qui ouvre un livre feuilletable, sans watermark ni mention de la plateforme.

- **100 % gratuit** : Vercel (plan Hobby) + Supabase (plan Free). Aucune API payante.
- **Conversion dans le navigateur** : le PDF est découpé en images WebP par votre navigateur (pdf.js) au moment de l'upload. Le serveur ne fait aucun calcul lourd et les clients ne téléchargent jamais le PDF pour feuilleter.
- **Aperçu soigné** : titre, description et image de couverture apparaissent quand le lien est collé dans WhatsApp, LinkedIn ou un mail.
- **PDF téléchargeable** : mêmes pages que le catalogue en ligne, ouverture en doubles pages.
- **Liens permanents** : un lien fonctionne tant que vous ne le désactivez pas depuis l'administration.

> **Avancement** : le code est complet.
> ✅ Schéma Supabase · ✅ Lecteur `/c/[slug]` · ✅ Administration `/admin` (création, import, chargement, lien, renommage, désactivation, suppression) · ✅ PDF téléchargeable · ✅ Connexion par mot de passe · ✅ Cron anti-pause Supabase
> 👉 À faire de votre côté pour être en ligne : créer le projet Supabase (étapes 2 à 4) puis déployer sur Vercel (étape 6).

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
10. [Durée des liens et envoi par e-mail (Outlook)](#10-durée-des-liens-et-envoi-par-e-mail-outlook)
11. [Architecture et sécurité](#11-architecture-et-sécurité)
12. [Dépannage](#12-dépannage)

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
9. **Mise à jour** : après chaque mise à jour du code qui modifie `supabase/schema.sql` (par exemple l'ajout de la colonne `is_active` pour désactiver un lien), relancez le script complet de la même façon. Tant que ce n'est pas fait, les catalogues restent lisibles ; seule la désactivation d'un lien affiche un message vous demandant de lancer le script.

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
   git clone https://github.com/Paris-Gastronomy-Distribution/PGLOG.git
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
   | `CRON_SECRET` | conseillé en production | Protège le cron quotidien qui garde Supabase actif |
   | `ENABLE_DEMO` | non | `true` pour garder `/c/demo` une fois Supabase configuré |

4. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
5. Ouvrez <http://localhost:3000/c/demo> : le catalogue de démonstration s'affiche (il fonctionne même sans Supabase).
6. Ouvrez <http://localhost:3000/admin>, connectez-vous avec `ADMIN_PASSWORD` et publiez un catalogue.

> **Mode local** : tant que les 3 variables Supabase sont vides, le site (`npm run dev` ou `npm run start`) enregistre les catalogues sur votre ordinateur (dossier `.local-data/`, ignoré par git). Pratique pour tout essayer avant de créer le projet Supabase. Les liens générés ne fonctionnent alors que sur votre machine. Dès que les variables Supabase sont renseignées (puis le serveur redémarré), tout passe automatiquement par Supabase. Sur Vercel, le mode local n'existe pas.

## 6. Déployer sur Vercel

1. Poussez votre code sur GitHub (branche `main`).
2. Sur <https://vercel.com/new>, cliquez sur **Import** en face du dépôt `PGLOG`. Si le dépôt n'apparaît pas, cliquez sur *Adjust GitHub App Permissions* et donnez l'accès au dépôt.
3. **Framework Preset** : *Next.js* (détecté automatiquement). Ne modifiez ni *Root Directory* ni les commandes de build.
4. Dépliez **Environment Variables** et ajoutez une à une les variables de votre `.env.local` (même nom, même valeur) : les 3 variables Supabase, `ADMIN_PASSWORD` (choisissez un **vrai** mot de passe, pas celui de test) et `CRON_SECRET` (chaîne aléatoire, voir `.env.example`). Pour `NEXT_PUBLIC_SITE_URL`, laissez vide pour l'instant ou mettez l'URL définitive si vous la connaissez.
5. Cliquez sur **Deploy** et attendez la fin du build (1 à 2 minutes).
6. Vercel affiche l'URL du site (`https://pglog-xxxx.vercel.app`). Ouvrez `https://…/admin`, connectez-vous et publiez un premier catalogue pour vérifier toute la chaîne.
7. Le cron anti-pause est créé automatiquement à partir de `vercel.json` (visible dans **Settings → Cron Jobs**) : il interroge la base une fois par jour.
8. Les déploiements suivants sont automatiques : chaque `git push` sur `main` redéploie le site.
9. Si vous modifiez une variable d'environnement plus tard : **Project → Settings → Environment Variables**, puis **Deployments → ⋯ → Redeploy** pour qu'elle soit prise en compte.

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
6. Dans **Settings → Environment Variables**, renseignez `NEXT_PUBLIC_SITE_URL=https://catalogues.mondomaine.fr` puis redéployez (étape 6.9).
7. Testez l'aperçu d'un lien en le collant dans WhatsApp ou LinkedIn. Pour LinkedIn, le *Post Inspector* (<https://www.linkedin.com/post-inspector/>) force le rafraîchissement de l'aperçu.

## 8. Utilisation au quotidien

1. **Sur Canva** : *Partager → Télécharger → PDF Standard*. Le poids maximum est de 50 Mo (*PDF Impression* est souvent trop lourd).
2. Ouvrez `https://votre-domaine/admin` et saisissez le mot de passe (`ADMIN_PASSWORD`). La session dure 30 jours.
3. **Accueil** : la liste de vos catalogues. Cliquez sur **Nouveau catalogue**.
4. **1 · Le PDF** : glissez le fichier dans la zone (ou cliquez pour le choisir). Un aperçu de la couverture et le nombre de pages s'affichent. Le titre est pré-rempli depuis le nom du fichier.
5. **2 · Les informations** :
   - **Titre** : visible par vos clients et dans l'aperçu WhatsApp/LinkedIn ;
   - **Lien** : se remplit tout seul depuis le titre, reste modifiable, et indique s'il est disponible ;
   - **Description** (facultatif), **couleur des boutons** du lecteur ;
   - **Proposer le téléchargement en PDF** (activé par défaut) : ajoute le bouton « Télécharger ». Le PDF est assemblé à partir des pages du catalogue en ligne : même contenu, même format de page, ouverture en doubles pages comme le lecteur.
6. Cliquez sur **Publier le catalogue**. L'écran de chargement affiche la progression réelle (« Conversion de la page 7/24 »). **Gardez l'onglet ouvert** : la conversion se fait dans votre navigateur. **Annuler** nettoie ce qui a déjà été envoyé.
7. **Lien prêt** : **Copier le lien**, **Ouvrir**, ou envoyez-le directement par **WhatsApp** ou **e-mail**.
8. Depuis l'accueil, chaque catalogue propose : **Copier le lien**, **Ouvrir**, **Renommer / modifier** et **Supprimer**.
   - **Modifier** : titre, description, couleur, téléchargement PDF (s'il n'existe pas encore, il est créé à l'enregistrement à partir des pages en ligne) et **Lien actif**. Le lien ne change jamais.
   - **Lien actif** décoché : le lien affiche « Ce catalogue n'est plus en ligne ». Rien n'est supprimé, vous pouvez le réactiver à tout moment. Le badge « Lien désactivé » apparaît sur la carte.
   - **Supprimer** : la fiche et tous ses fichiers sont effacés, définitivement.

## 9. Limites du gratuit

| Service | Limite (plan gratuit) | Ce que ça représente |
|---|---|---|
| Supabase Storage | 1 Go de stockage | ~150 à 300 catalogues de 24 pages sans PDF. Un PDF stocké pour téléchargement peut peser jusqu'à 50 Mo. |
| Supabase Storage | 50 Mo max par fichier | Taille maximale d'un PDF |
| Supabase egress | 5 Go/mois | ~1 000 à 2 000 lectures complètes d'un catalogue de 24 pages. Le chargement progressif ne télécharge que les pages réellement feuilletées. |
| Supabase | **Pause après 7 jours sans activité** | Le cron Vercel quotidien (`/api/keepalive`, déclaré dans `vercel.json`) interroge la base pour éviter la pause. Si le projet est quand même en pause : dashboard Supabase → *Restore project*. |
| Vercel Hobby | 100 Go de bande passante/mois | Largement suffisant : les images sont servies par Supabase. |

⚠️ **Conditions d'utilisation de Vercel** : le plan Hobby est réservé à un usage **personnel et non commercial**. Pour un usage professionnel strict, Vercel demande le plan Pro. L'alternative gratuite qui autorise l'usage commercial est Cloudflare Workers (avec OpenNext), qui demande quelques adaptations.

## 10. Durée des liens et envoi par e-mail (Outlook)

### Un lien reste valable tant que vous ne le désactivez pas

- L'adresse `/c/{lien}` ne dépend d'aucun jeton ni d'aucune date d'expiration : les pages sont des fichiers publics du stockage, la fiche est en base.
- Renommer, changer la couleur ou le PDF ne change **jamais** le lien.
- Le lien cesse de fonctionner dans trois cas seulement : vous décochez **Lien actif**, vous **supprimez** le catalogue, ou l'hébergement est interrompu.
- Pour que l'hébergement ne s'interrompe pas :
  - **Pause Supabase** : le cron quotidien (`/api/keepalive`) l'évite. Vérifiez une fois dans Vercel (**Settings → Cron Jobs**) qu'il s'exécute sans erreur, et que `CRON_SECRET` est défini dans Vercel.
  - **Quotas gratuits** (tableau ci-dessus) : surveillez l'*egress* Supabase si un catalogue est très diffusé. Un dépassement durable peut conduire Supabase à restreindre le projet.
  - **Domaine** : utilisez votre propre domaine (étape 7). Si vous changez de domaine plus tard, les anciens liens ne suivront pas.
- Désactiver un lien masque le lecteur. Un fichier déjà téléchargé (le PDF) reste évidemment chez la personne qui l'a.

### Envoyer le lien par Outlook sans finir en spam

Un lien seul ne bloque jamais l'envoi d'un e-mail. Le classement en spam dépend surtout de votre domaine d'envoi et de la réputation du domaine du lien. Le site est préparé pour ça :

- page catalogue qui répond immédiatement (y compris aux robots de sécurité d'Outlook, *Safe Links*, qui ouvrent le lien avant votre client) ;
- aucune redirection, aucun formulaire, aucun traceur sur les pages clients ;
- titre, description et image d'aperçu propres pour l'aperçu du lien dans Outlook ;
- bouton **E-mail** de l'administration : brouillon en texte simple, un seul lien écrit en clair.

Ce qui reste de votre côté, par ordre d'importance :

1. **Brancher un domaine de l'entreprise** (étape 7), par exemple `catalogues.votre-domaine.fr`. Les adresses gratuites partagées (`*.vercel.app`) hébergent aussi des sites malveillants et sont plus souvent signalées par Microsoft Defender. Un lien sur le même domaine que l'adresse d'envoi est le signal le plus rassurant pour les filtres.
2. **Envoyer depuis la messagerie de l'entreprise** (Microsoft 365 / Outlook), dont le domaine est authentifié (SPF, DKIM, DMARC : à vérifier avec votre prestataire informatique si ce n'est pas déjà fait).
3. **Écrire le lien en clair** ou sur un texte explicite (« Voir le catalogue »). Évitez les raccourcisseurs (bit.ly…) et un texte de lien qui affiche une autre adresse que la vraie destination.
4. Préférez le lien à la pièce jointe : un PDF lourd joint au mail est plus souvent bloqué qu'un lien.

## 11. Architecture et sécurité

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
- **Cache** : chaque page catalogue est mise en cache 5 minutes (ISR) puis servie instantanément. L'admin invalide le cache à la création et à la suppression d'un catalogue.
- **Images** : servies directement par Supabase (`<img>`), sans passer par l'optimiseur d'images de Vercel, ce qui évite ses quotas.
- **PDF téléchargeable** : assemblé dans le navigateur de l'admin à partir des rendus des pages (JPEG, qualité ajustée page par page pour rester sous la limite de 50 Mo), format de page d'origine, affichage en doubles pages (`/PageLayout /TwoPageRight`).
- **Désactivation** : colonne `is_active` ; un lien désactivé affiche une page sobre « Ce catalogue n'est plus en ligne ».
- **Identité visuelle** : logo dans `public/brand/`, icône d'onglet (chapeau, fichier d'origine) dans `src/app/icon.svg`, `favicon.ico` et `apple-icon.png` pour les anciens clients et l'écran d'accueil iPhone.
- **Catalogue de démonstration** : `/c/demo` est servi depuis `public/demo/` (fichiers générés par `node scripts/generate-demo.mjs`). Visible tant que Supabase n'est pas configuré, puis masqué automatiquement (sauf `ENABLE_DEMO=true`).
- **En-têtes HTTP** : pas d'en-tête `X-Powered-By`, `nosniff` partout, et l'administration refuse d'être affichée dans une iframe.
- **Administration** : `/admin` est protégé par un cookie de session signé (HMAC, `httpOnly`, 30 jours). Le middleware bloque `/admin` sans session, et chaque action serveur (création, modification, suppression) revérifie la session. Les fichiers partent du navigateur directement vers Supabase via des URLs d'upload signées, valables uniquement pour le catalogue en cours.
- **Police** : Inter, auto-hébergée via le paquet npm `@fontsource-variable/inter` (aucun appel à Google).

### Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement sur <http://localhost:3000> |
| `npm run build` | Build de production (identique à Vercel) |
| `npm run start` | Lance le build de production en local |
| `npm run lint` | Vérification ESLint |
| `node scripts/generate-demo.mjs` | Régénère le catalogue de démonstration |

## 12. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `/admin` affiche « Configuration Supabase requise » | Variables Supabase absentes sur Vercel | Ajoutez-les (étape 6.4) puis redéployez (étape 6.9). |
| « Mot de passe non configuré » sur la page de connexion | `ADMIN_PASSWORD` absent | Ajoutez-le dans `.env.local` ou dans Vercel, puis redémarrez / redéployez. |
| La publication échoue après plusieurs essais | Connexion instable pendant l'envoi | Cliquez sur **Réessayer** : les fichiers partiels sont nettoyés automatiquement. |
| « Ce navigateur ne sait pas créer d'images WebP » | Safari | Utilisez Chrome, Edge ou Firefox pour l'administration (les clients, eux, peuvent utiliser Safari). |
| « Ce PDF pèse … la limite est de 50 Mo » | Export *PDF Impression* | Sur Canva, exportez en *PDF Standard*. |
| Les catalogues renvoient une erreur après des semaines sans visite | Projet Supabase mis en pause | Dashboard Supabase → *Restore project*, et vérifiez que `CRON_SECRET` est bien défini. |
| `npm run dev` : *address already in use :::3000* | Un ancien serveur tourne encore | Fermez-le (Gestionnaire des tâches → *Node.js*) ou lancez `npm run dev -- -p 3001`. |
| Un lien collé dans LinkedIn montre un ancien aperçu | Cache de LinkedIn | Passez le lien dans le *Post Inspector* LinkedIn. |
| « La base doit être mise à jour » en désactivant un lien | Colonne `is_active` absente | Relancez `supabase/schema.sql` (étape 3). |
| Les `git push` ne redéploient plus le site | Dépôt transféré vers l'organisation GitHub | Vercel → **Project → Settings → Git** : reconnectez le dépôt `Paris-Gastronomy-Distribution/PGLOG` (installez l'application Vercel sur l'organisation si elle n'y a pas accès). |
