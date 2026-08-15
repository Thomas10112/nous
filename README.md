# Nous

Un site privé, à deux. Journal, carte, classement d'Airbnb, capsules temporelles,
moodboard collaboratif — et un compteur qui tourne depuis le premier jour.

Il fonctionne tout de suite, sans compte ni serveur. Et quand vous voulez pouvoir
écrire **tous les deux, depuis vos PC et vos téléphones**, une petite configuration
suffit (section « Écrire à deux » plus bas).

---

## Démarrer

```bash
npm install
```

```bash
npm run dev
```

Le site s'ouvre sur http://localhost:5173.

Au premier lancement, il vous demande vos deux prénoms, la date de début et une
phrase à vous. Tout est modifiable ensuite dans **Réglages**.

### Les commandes

| Commande | Ce qu'elle fait |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run dev:lan` | Idem, accessible depuis votre téléphone sur le même wifi |
| `npm run build` | Compile le site dans `dist/` |
| `npm run preview` | Teste le résultat compilé |
| `npm run typecheck` | Vérifie les types sans compiler |

Pour ouvrir le site depuis votre téléphone pendant que vous le développez :
lancez `npm run dev:lan`, puis rendez-vous sur `http://<ip-de-votre-pc>:5173`.

---

## Les sections

| | |
| --- | --- |
| **Accueil** | Votre photo, vos prénoms, votre phrase, et le compteur (années, mois, jours, et le total). Le crayon en haut à droite ouvre la personnalisation. |
| **Nos aventures** | Une frise par année. Date, lieu, photos, description, étiquettes, note sur 5. |
| **Nos mots** | Vos phrases mignonnes et vos private jokes, classées par type et par personne. Celles en « coup de cœur » remontent sur l'accueil, une différente chaque jour. |
| **Nos Airbnb** | Notez chaque logement sur des critères pondérés — le classement se recalcule seul. Les critères se modifient dans Réglages. |
| **Notre carte** | Lieux visités et lieux à découvrir. Recherche d'adresse intégrée, ou clic direct sur la carte. |
| **Bucket list** | Les envies à cocher, avec anneau de progression. |
| **Galerie** | Toutes les photos du site réunies — y compris celles ajoutées dans les autres sections. Regroupement par mois ou par album. |
| **Awards** | Meilleur voyage, plus grosse galère, moment le plus mignon… Dix catégories proposées, et les vôtres. |
| **Capsules** | Un message scellé jusqu'à une date, avec décompte. |
| **Moodboard** | Un plan infini : dessin à la souris ou au stylet, texte, post-it, photos, autocollants, formes. Tout se déplace, se redimensionne et se tourne. |

---

## Écrire à deux

Par défaut, tout est stocké **dans le navigateur de l'appareil** (IndexedDB). C'est
parfait pour essayer, mais l'autre personne ne voit rien de ce que vous écrivez.

Pour que vous puissiez écrire tous les deux, chacun depuis son PC et son téléphone,
il faut un endroit commun. Le projet est prêt pour ça : comptez dix minutes.

### 1. Créer le projet

Sur [supabase.com](https://supabase.com), créez un compte et un projet (le plan
gratuit suffit très largement).

### 2. Créer les tables

Dans le menu **SQL Editor** → **New query**, collez tout le contenu du fichier
[`supabase/schema.sql`](supabase/schema.sql) et cliquez sur **Run**.

Ça crée la table des données, le stockage des photos, et active le temps réel.

### 3. Brancher le site

Dans **Project Settings → API**, copiez l'URL du projet et la clé `anon public`.
Puis, à la racine du projet :

```bash
cp .env.example .env
```

Ouvrez `.env` et remplissez :

```
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_SPACE_ID=un-mot-que-vous-seuls-connaissez
```

Relancez `npm run dev`. En bas de la barre latérale, le point doit passer au vert :
**Synchronisé**. Ce que l'un écrit apparaît chez l'autre en direct, sans rechargement.

> Si vous aviez déjà ajouté des photos en mode local, allez dans
> **Réglages → Écrire à deux → Transférer** : elles seront envoyées dans l'espace
> partagé pour que l'autre personne puisse les voir.

### 4. Mettre le site en ligne

Pour y accéder depuis vos téléphones, il faut l'héberger. Le plus simple, gratuit :

1. Poussez le dossier sur un dépôt **GitHub privé**.
2. Sur [vercel.com](https://vercel.com) (ou [netlify.com](https://netlify.com)),
   importez ce dépôt.
3. Ajoutez les trois variables `VITE_…` dans les réglages du projet.
4. Déployez.

Vous obtenez une adresse à ouvrir depuis n'importe où. Ajoutez-la à l'écran
d'accueil de vos téléphones : elle s'ouvre comme une application.

### Créer les deux comptes

Le site est fermé : il faut un compte pour entrer. Il n'y a pas d'inscription
publique, vous créez les deux comptes à la main.

**1. Les comptes.** On ne se connecte pas avec une adresse e-mail mais avec un
**surnom** — celui que vous vous donnez le plus. Supabase, lui, ne sait
authentifier que des adresses : le site en fabrique donc une, invisible, à
partir du surnom.

La règle : on ne garde que les **lettres et les chiffres** (accents, majuscules,
espaces et tirets disparaissent), puis on ajoute `@nous.local`.

| Le surnom | L'adresse à créer dans Supabase |
| --- | --- |
| `Doudou` | `doudou@nous.local` |
| `Ma Puce` | `mapuce@nous.local` |
| `Mon Cœur` | `moncoeur@nous.local` |

Dans Supabase → **Authentication → Users → Add user → Create new user** :
saisissez cette adresse et un mot de passe, et **cochez « Auto confirm user »**.
Recommencez pour la deuxième personne.

Le formulaire de Supabase impose un champ « Email address » — c'est sa seule
façon d'identifier un compte. **Ce n'est pas une vraie boîte mail** : aucun
message n'y sera jamais envoyé, et personne ne la verra. Sur le site, on ne tape
que le surnom.

> **Si Supabase refuse le domaine `nous.local`**, deux solutions : mettez
> `VITE_LOGIN_DOMAIN=autrechose.fr` dans `.env` et créez les comptes avec ce
> domaine-là — ou tapez directement l'adresse complète dans le champ « surnom »
> du site, qui l'accepte telle quelle en dépannage.
>
> Évitez `@gmail.com` : l'adresse pourrait appartenir à quelqu'un de réel, et une
> réinitialisation de mot de passe partirait chez cette personne.

**2. Fermer les portes.** Dans **SQL Editor**, lancez
[`supabase/auth.sql`](supabase/auth.sql). Ce script remplace les règles ouvertes
par des règles qui exigent un compte connecté, et passe le bucket photos en privé.

> ⚠️ **Créez les comptes avant de lancer ce script.** Une fois passé, plus
> personne n'accède aux données sans être connecté — vous compris.

**3. Se connecter.** Rechargez le site : l'écran de connexion apparaît, et il
demande **« Le surnom que je te donne le + »**. Chacun entre son surnom et son
mot de passe, sur chacun de ses appareils. La session reste ouverte, on ne
redemande pas le mot de passe à chaque visite.

**4. La surprise.** La personne qui n'a **pas** configuré le site a droit, à sa
toute première connexion, à une petite demande en bonne et due forme — avec un
bouton « Non » qui devient de plus en plus difficile à attraper. Vous pouvez la
regarder avant depuis **Réglages → La surprise → Voir l'aperçu** : l'aperçu ne
la consomme pas et ne change rien.

Pour vous déconnecter : votre avatar en bas de la barre latérale (ou en haut à
gauche sur téléphone) → **Se déconnecter**.

**Mot de passe oublié ?** Il n'y a pas d'e-mail de réinitialisation. Passez par
Supabase → **Authentication → Users** → les trois points au bout de la ligne →
**Reset password**.

### À quel point c'est privé ?

Une fois `auth.sql` passé : **sérieusement privé.**

La clé publique et le `VITE_SPACE_ID` restent visibles dans le JavaScript du
site — c'est inévitable avec une application qui tourne dans le navigateur. Mais
ils ne servent plus à rien sans compte : les règles Postgres exigent un
`auth.uid()`, et le bucket photos est privé. Quelqu'un qui trouve l'adresse du
site tombe sur l'écran de connexion, et rien d'autre.

Les photos ne sont plus servies par des liens publics mais par des **URLs signées**
valables 4 heures, que seul un compte connecté peut obtenir.

Ce qui reste à votre charge : des mots de passe corrects, et ne pas laisser une
session ouverte sur un appareil prêté.

---

## Sauvegarder

**Réglages → Nos données → Télécharger une sauvegarde** produit un fichier JSON
contenant tous vos textes. Le bouton d'à côté le restaure.

Les photos, elles, ne sont pas dans ce fichier : elles restent dans le navigateur
(mode local) ou dans votre espace Supabase (mode partagé).

---

## Comment c'est fait

React + TypeScript + Vite. Framer Motion pour les animations, Leaflet pour la carte.
Aucune bibliothèque de composants : l'interface est écrite à la main, ce qui garde
le bundle léger et le style cohérent.

```
src/
├── data/
│   ├── types.ts            Le modèle de données, en un coup d'œil
│   ├── store.tsx           Le seul endroit qui parle au stockage
│   ├── idb.ts              IndexedDB (données + photos hors ligne)
│   ├── media.ts            Compression des images avant stockage
│   └── adapters/
│       ├── adapter.ts      Le contrat commun (+ la capacité « auth »)
│       ├── local.ts        Ce navigateur seulement — pas de compte
│       └── cloud.ts        Supabase : connexion, partage, temps réel
├── components/
│   ├── Layout.tsx          Barre latérale (PC) / onglets (mobile)
│   └── ui/                 Boutons, cartes, modales, champs, images…
├── pages/                  Une page par section
├── lib/                    Dates, utilitaires
└── styles/
    ├── tokens.css          Couleurs, typographie, espacements
    └── global.css
```

### Le point important : la couche de données

Les pages n'appellent jamais IndexedDB ni Supabase. Elles passent par
`useCollection('adventures')`, qui renvoie `{ items, create, update, remove }`.

Dessous, un **adaptateur** implémente le contrat de `adapters/adapter.ts`. Il y en
a deux aujourd'hui — local et cloud — et le store choisit selon la présence du
fichier `.env`. Écrire un troisième adaptateur (Firebase, une API à vous) ne
demanderait de toucher à aucune page.

L'authentification suit la même logique : c'est une **capacité optionnelle** de
l'adaptateur (`auth?: AuthCapability`). L'adaptateur local ne l'implémente pas —
sur son propre appareil, on est déjà chez soi — et le site affiche alors
directement le contenu. L'adaptateur cloud l'implémente, et `App.tsx` en déduit
tout seul qu'il faut afficher l'écran de connexion. Aucune page ne sait qu'une
authentification existe.

Côté base, tout tient dans **une seule table** `items` :

```
space | collection | id | data (jsonb)
```

Une seule souscription temps réel couvre donc tout le site, et ajouter une
rubrique plus tard ne demande aucune migration SQL.

### Ajouter une section

1. Décrivez le type dans `src/data/types.ts` et ajoutez la collection à `DB`,
   `COLLECTIONS` et `emptyDB()`.
2. Créez `src/pages/MaSection.tsx` — le plus simple est de partir de `Bucket.tsx`.
3. Déclarez la route dans `src/App.tsx` et l'entrée de menu dans
   `src/components/Layout.tsx`.

Rien à faire côté base de données.

### Changer les couleurs

Tout part de `src/styles/tokens.css`. Modifier `--accent` suffit à changer
l'humeur du site entier, en clair comme en sombre.

---

## Deux ou trois détails

- **Les photos** sont redimensionnées à 1920 px et recompressées avant stockage :
  une photo de téléphone passe de 6 Mo à quelques centaines de Ko.
- **Les capsules** masquent leur message jusqu'à la date choisie. C'est un verrou
  de confiance, pas un coffre-fort : quelqu'un de déterminé pourrait lire la donnée
  brute. C'est volontaire — on préfère ça à un message perdu avec sa clé.
- **Le moodboard** utilise les événements Pointer : souris, doigt et stylet passent
  par le même chemin. Pendant un déplacement, seul l'affichage bouge ; l'écriture
  n'a lieu qu'au relâchement, pour ne pas saturer le réseau.
- **La carte** utilise OpenStreetMap et CARTO, sans clé d'API. La recherche
  d'adresse passe par Nominatim, également gratuit.
- **« Qui écrit »** est stocké par appareil : chacun choisit son prénom sur son
  propre téléphone, et les entrées sont signées automatiquement.
