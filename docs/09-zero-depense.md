# 09 — Zéro dépense : ce qui tient, ce qui casse, ce qu'on décide

> Le 6 septembre 2026, le couple a posé une contrainte nouvelle : **ne rien payer**, ni
> abonnement ni achat unique. Ni compte Apple Developer (99 €/an), ni Supabase Pro
> (25 $/mois), ni Google Play Console (25 $), ni Mac, ni plan EAS, ni nom de domaine.
> Ce document remplace toutes les hypothèses payantes des documents 01 à 08 et de la
> roadmap. La décision est consignée dans [ADR-009](adr/ADR-009-zero-depense.md).
>
> **Méthode.** Sept postes (iPhone sans compte payant, Expo Go, PWA iOS, Supabase gratuit,
> Android sans Play Console, GitHub gratuit, notifications) instruits chacun par un
> chercheur, relus par deux contre-expertises (documentation officielle datée / terrain :
> issues et discussions 2025-2026), puis passés à une critique de complétude. 22 agents,
> environ 170 faits, sources datées. Les chiffres marqués **(à relire)** viennent de pages
> que le proxy de la session bloquait (expo.dev/pricing, firebase.google.com,
> backblaze.com, cron-job.org, uptimerobot.com, vercel.com) : ils sont plausibles mais à
> confirmer en un clic avant d'en dépendre.

## 1. La décision en une page

| Sujet | Décision | Coût |
| ----- | -------- | ---- |
| **Android** | Plateforme principale. Tout le périmètre du brief tient à 0 € : app installée, hors ligne, widgets, push, notifications locales, mises à jour. | 0 € |
| **iPhone** | **Aucune voie native gratuite durable** : re-signature tous les 7 jours, pas de push Apple, widgets tiers cassés sous les sideloaders en 2026. Si l'un de vous a un iPhone, **son client est la PWA** (le site, transformé en web app installée avec Web Push), avec un périmètre réduit accepté par écrit : pas de widget iOS, pas de notification locale planifiée sur l'appareil (elles partent du serveur), temps réel seulement app ouverte. La voie native sideloadée n'est qu'un spike borné à deux jours. | 0 € |
| **Supabase** | Plan gratuit conservé sans limite de durée. Le projet ne doit **jamais** se mettre en pause (restaurations défaillantes documentées en 2025-2026) : le maintien en vie devient une fonction du produit (RPC `ping()` à chaque ouverture et dans la tâche de fond) doublée d'une sauvegarde hebdomadaire qui touche la base. | 0 € |
| **Médias** | 1 Go, 50 Mo par fichier, 5 + 5 Go de sortie par mois, pas de transformation d'image : l'app stocke des **vignettes et des photos compressées** ; les originaux et les vidéos restent dans la galerie du téléphone ; vidéos dans l'app limitées à ~10 s / 5 Mo avec purge. Pas de R2, B2 ni Cloudflare Access (carte bancaire exigée ou non vérifiable). | 0 € |
| **Builds** | Builds Android locaux (`npx expo run:android`, Linux ou WSL2) et en CI GitHub Actions ; **EAS Build n'est qu'un secours**, EAS Update (JS) un confort. iOS natif : un `.ipa` non signé sur runner macOS GitHub, uniquement pour le spike. | 0 € |
| **Distribution** | APK signé publié en **GitHub Release** (hors quota, sans limite de bande passante) ; Obtainium sur les téléphones pour les mises à jour ; en 2027, compte Android « distribution limitée » (gratuit, 20 appareils) pour rester installable. | 0 € |
| **Push** | Android : projet Firebase (plan Spark) appelé par une Edge Function Supabase, priorité haute. iPhone : Web Push depuis la PWA (Apple : aucun programme développeur requis). Rappels J-7 / J-1 / habitudes : notifications locales sur Android, envoyées par le serveur pour la PWA. | 0 € |
| **Cartes** | Le site v1 utilise des tuiles CARTO **sans clé**, désormais filigranées et en cours de retrait, et l'autocomplétion Nominatim que la politique OSM interdit : passer à MapLibre + tuiles vectorielles CARTO (clé gratuite) ou OpenFreeMap, géocodage Photon ou CARTO, recherche à la validation. | 0 € |
| **Dépôt GitHub** | Le dépôt est **public** (constaté le 06/09) : minutes Actions illimitées, Releases téléchargeables sans jeton, Dependabot et protections de branche gratuites. En échange, le code est lisible par tous et les secrets ne doivent jamais y entrer. À confirmer par le couple (§6). | 0 € |

**Le seul arbitrage payant qui changerait quelque chose** : les 99 €/an d'Apple, qui
rouvriraient le plein périmètre iOS (push, widgets, profils d'un an). Tout le reste tient à
0 € avec les réductions de périmètre ci-dessus. Le couple a dit non : la suite est écrite
pour 0 €.

## 2. iPhone sans compte Apple payant

### 2.1 Ce qu'Apple accorde à un Apple ID gratuit (source officielle, confiance haute)

- **Limites** : 10 App IDs, 3 appareils, 3 apps par appareil, profils de provisionnement
  valables **7 jours** puis l'app ne se lance plus tant qu'elle n'est pas re-signée
  ([compare-memberships](https://developer.apple.com/support/compare-memberships/)).
- **Disponible** : App Groups, Background Modes, Data Protection, Keychain Sharing.
  **Indisponible** : Push Notifications, Time Sensitive / Communication Notifications,
  iCloud, Associated Domains, Sign in with Apple
  ([supported-capabilities-ios](https://developer.apple.com/help/account/reference/supported-capabilities-ios/)).
  Donc aucun push APNs, aucun push silencieux, aucun Universal Link.
- **EAS Build** ne produit pas de build iOS installable sans compte payant (doc
  *Internal distribution*, message d'`eas-cli`). **DMA / boutiques alternatives / Web
  Distribution** : réservés aux membres payants, avec critères d'entreprise au
  1er octobre 2026 ([DMA and apps in the EU](https://developer.apple.com/support/dma-and-apps-in-the-eu/)).
- **Un Mac ne change rien** aux entitlements ni aux 7 jours : il évite seulement le
  runner GitHub pour produire le `.ipa`.

### 2.2 Ce que donnent les sideloaders en 2026 (terrain, confiance moyenne)

| Outil | PC nécessaire | Rafraîchissement | État iOS 26 |
| ----- | ------------- | ---------------- | ----------- |
| Sideloadly (Windows/macOS, fermé) | À l'installation et à chaque refresh (démon Wi-Fi/USB, PC allumé) | automatique si le PC est là | annoncé « iOS 26+ » (site bloqué, non vérifié) ; issues ouvertes 2026 (anisette « No OTP ») |
| AltStore Classic (AltServer Windows/macOS) | Idem | idem, même Wi-Fi | issues ouvertes sept. 2025 → sept. 2026 ; mode sans ordinateur réservé aux Patrons (payant) |
| **SideStore** (libre) | Seulement au pairing initial (`iloader`, Windows/macOS/Linux) | sur l'appareil via LocalDevVPN (Wi-Fi requis, VPN actif) | régressions 26.4 corrigées au printemps 2026 ; issue 26.6.1 ouverte ; **iOS 27 attendu mi-septembre** |

Pièges relevés sur le terrain : le bundle ID est suffixé du Team ID (l'App Group
`group.<bundle>` d'`expo-widgets` doit être réécrit), les identifiants
`BGTaskSchedulerPermittedIdentifiers` ne sont pas réécrits (la tâche de fond ne tourne
jamais, SideStore #1475), les extensions imbriquées peuvent être tuées à la signature
(#1467, ouverte), les widgets tiers ont des App Groups inaccessibles (#1437). Un Apple ID
**dédié** (« burner », 2FA, numéro de téléphone) est recommandé : les serveurs anisette
partagés ont fait verrouiller des comptes. Apple a testé une « developer verification via
internet » sur iOS 26.4 bêta (AltStore #1726) : si elle se généralise, le sideload gratuit
peut disparaître.

**Verdict natif iOS gratuit** : app installée avec icône, SQLite, notifications locales
= faisable ; push distant = impossible ; widgets = à tester, cassables à chaque version
iOS ; coût humain ≈ 5–10 min par semaine plus 2–4 h à chaque iOS majeur, PC allumé si
Sideloadly/AltServer. Ce n'est pas un client quotidien pour un partenaire non technique.

### 2.3 La PWA sur iPhone (confiance haute sur l'essentiel)

- Depuis iOS 26, tout site ajouté à l'écran d'accueil s'ouvre comme web app ; le manifest
  reste utile pour l'icône et le nom.
- **Web Push** pour les web apps d'écran d'accueil depuis iOS 16.4, **Declarative Web Push**
  et badge depuis 18.4 ; Apple : « You don't need to join the Apple Developer Program to
  send web push notifications » ([doc Apple](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)).
  Permission demandée depuis un geste ; **jamais de push silencieux** (Safari révoque la
  permission si un push n'affiche rien) ; payload 4 Ko ; chiffré de bout en bout.
- **Stockage** : IndexedDB, exempté de l'effacement ITP à 7 jours quand l'app est sur
  l'écran d'accueil ; bugs IndexedDB corrigés en 26.3 et 26.5 ; prévoir un rechargement
  forcé sur erreur et un bouton « réinitialiser ». SQLite-WASM/OPFS reste fragile sur
  iOS : **IndexedDB (Dexie)** pour le web, `expo-sqlite` pour le natif → `packages/data` a
  deux adaptateurs.
- **Impossible en PWA iOS** : widgets, notifications locales planifiées sans serveur,
  Background Sync, Share Target (recevoir un partage), haptique riche (`navigator.vibrate`
  non supporté, WebKit s'y oppose), 120 Hz par défaut (drapeau utilisateur).
- **Instabilité récurrente** après chaque iOS x.0 : bug clavier/viewport 26.0 → 26.1,
  gel des PWA 26.4 → 26.5 (fenêtres de 7 semaines). Exiger iOS ≥ 26.5 pour le drag
  (correctif `pointerdown`/scroll).
- **Le web v1 n'est pas une PWA** : aucun manifest, aucun service worker, polices Google
  Fonts en ligne (audit D19). C'est un chantier : `vite-plugin-pwa`, manifest, polices
  auto-hébergées, stratégie de mise à jour du service worker, adaptateur IndexedDB.
- **Ne pas** construire la PWA avec `react-native-web` (maintenance seulement, Reanimated
  et Gesture Handler dégradés sur le web) : garder Vite pour `apps/web`. Le domaine et le
  moteur de sync sont partagés à 100 % ; l'UI web est écrite une seconde fois. Estimation
  interne : adaptateur + PWA ≈ 1–2 semaines, puis chaque écran ≈ 30–50 % de sa version RN.
- Hébergement : le site est déjà sur **Vercel Hobby** (`nous-ecru.vercel.app`, usage
  personnel non commercial autorisé, sans carte) : origine HTTPS stable, aucun domaine à
  acheter. Un changement d'origine invaliderait les abonnements push et l'installation.

## 3. Expo Go : bon pour le spike, pas pour vivre

- Expo Go SDK 57 embarque exactement ce que le spike utilise (`react-native` 0.86.3,
  Reanimated 4.5.1, worklets 0.10.1, Gesture Handler 2.32, `expo-haptics`,
  `safe-area-context`) : le **spike se teste gratuitement sur les deux téléphones**, iPhone
  compris, sans compte Apple. Depuis fin août 2026, Expo Go iOS exige d'être **connecté au
  même compte Expo** que la CLI (PR expo #48865) ; Android pas encore.
- Expo Go **n'est pas un runtime quotidien** : pas d'icône propre, pas de widgets
  (`expo-widgets`, `react-native-android-widget`), pas de push (retiré depuis SDK 53), une
  seule version de SDK à la fois (mise à jour automatique des stores qui casse le projet),
  Expo Go iOS bloqué ~4 mois en review App Store en 2026, updates EAS réservées au
  propriétaire depuis mai 2026, bundles Hermes refusés. Et sur **Android + SDK 57, importer
  `expo-notifications` fait planter Expo Go au démarrage** (issue #49044, correctif non
  rétroporté au 04/09/2026) : dès la Phase 2, tout passe par un build de développement
  local.
- Pour le spike : désactiver les mises à jour automatiques d'Expo Go sur les deux
  téléphones pendant la mesure ; le compteur de frames est pessimiste en mode dev (le
  drag tourne sur le thread UI, mais le JS est non optimisé) ; la mesure de référence
  Android se fait sur un build release local.

## 4. Supabase gratuit : quotas exacts et règles de survie

Doc live du 06/09/2026 ([billing-on-supabase](https://supabase.com/docs/guides/platform/billing-on-supabase)) :

| Quota | Gratuit | Pour Nous |
| ----- | ------- | --------- |
| Projets actifs | 2 (les projets en pause ne comptent pas) | 1 utilisé, 1 libre pour un environnement de test |
| Base | 500 Mo, **lecture seule au-delà** | surveiller `pg_database_size` < 400 Mo ; purger `cron.job_run_details` et `realtime.messages` |
| Storage | 1 Go, **50 Mo par fichier** (non modifiable), pas de transformation d'image | vignettes côté client (`expo-image-manipulator`) |
| Egress | 5 Go non caché + 5 Go caché par mois ; dépassement = 402 sur toutes les API jusqu'au mois suivant | cache local des médias, jamais de re-téléchargement |
| Edge Functions | 500 000 appels/mois, 150 s, 2 s CPU, 256 Mo | large |
| Realtime | 200 connexions, 100 msg/s, 2 M msg/mois, Broadcast 256 Ko | ≈ 3 messages par événement pour 2 téléphones |
| Auth | 50 000 MAU ; **SMTP intégré : 2 e-mails/h, uniquement vers les membres de l'organisation** | inviter les deux adresses dans l'organisation Supabase (gratuit) |
| Sauvegardes | aucune accessible | `supabase db dump` hebdomadaire + export Storage, hors Supabase |
| Extensions | `pg_cron`, `pg_net`, `pgTAP` disponibles | rappels serveur, tests |

**Pause** : après 7 jours sans « activité base suffisante » (« quelques requêtes par
jour »), e-mail une semaine avant. Fenêtre de restauration : 90 jours sur la doc live,
1 an sur la doc source (PR #48279, juillet 2026) — compter 90 jours. Surtout : les
restaurations 2025-2026 sont peu fiables (tables vides, `auth.users` vide, restauration
bloquée > 30 h, support gratuit en « quelques jours »). **Règle : ne jamais laisser le
projet se mettre en pause.** Personne ne sait si un job `pg_cron` interne compte comme
activité : les écritures doivent venir de l'API.

**Keep-alive légitime.** GitHub a désactivé l'action `keepalive-workflow` pour violation des
conditions d'utilisation (06/09/2026) et interdit sur ses runners « toute activité sans
rapport avec la production, le test ou le déploiement du projet ». Donc : (1) l'app appelle
une RPC `ping()` à chaque ouverture et dans sa tâche de fond ; (2) le workflow hebdomadaire
de **sauvegarde** (activité d'exploitation défendable) touche la base ; (3) un cron externe
(cron-job.org, **à relire**) en filet, à une minute décalée. Le dépôt étant public, la règle
des 60 jours sans commit qui désactive les workflows planifiés **s'applique** : ajouter
`workflow_dispatch` et vérifier l'onglet Actions chaque mois une fois le développement
terminé.

Autres points vérifiés : uploads TUS instables en React Native (403 RLS #844, échecs
> 6 Mo #563) → upload standard avec reprise applicative ; Realtime se reconnecte avec un
JWT périmé au réveil (supabase-js #2613) → `setAuth()` + resouscription + delta au retour
au premier plan, Realtime n'est qu'un accélérateur ; vérifier la publication
`supabase_realtime_messages_publication` après toute restauration ; Broadcast/Presence
Authorization et Broadcast from Database sont en bêta publique, sans restriction de plan.

## 5. Android sans Play Console

- **Vérification développeur Google** : à partir du 30/09/2026 au Brésil, en Indonésie, à
  Singapour et en Thaïlande, via les magasins participants seulement ; **mondial « 2027 et
  au-delà »**, France incluse par défaut, sans date. Le compte **« distribution limitée »**
  est gratuit, sans pièce d'identité, limité à 20 appareils autorisés par QR code, mais
  exige un profil de paiement Google (nom légal + adresse ; carte non documentée)
  ([guide](https://developer.android.com/developer-verification/guides/limited-distribution)).
  Replis : « advanced flow » (une fois, attente d'un jour) ou ADB. L'enregistrement lie le
  nom de package à l'**empreinte SHA-256 de la clé de signature** : perdre le keystore =
  package inenregistrable.
- **Un seul keystore, pour toujours**, généré localement (`keytool`) ou exporté d'EAS
  (`eas credentials`), sauvegardé dans un gestionnaire de mots de passe et en secret
  Actions. Le `build.gradle` généré par Expo signe la release **avec le keystore debug**
  sauf configuration : injecter le keystore par config plugin et vérifier chaque APK avec
  `apksigner verify --print-certs`. Un APK signé autrement ne se met pas à jour par-dessus
  l'ancien et ne reçoit pas de jeton FCM.
- **Taille** : un APK universel Expo vide fait ≈ 66 Mo ; construire **arm64-v8a seul**
  et distribuer par GitHub Release (2 Gio par fichier, hors quota), pas par Supabase Storage.
- **Build local** : `npx expo run:android --variant release` sur Linux ou WSL2 (sous
  Windows natif : Hermes V1 #43949 « not planned », chemins > 260 caractères) ; en CI,
  `ubuntu-latest` avec cache Gradle, 20–35 min à froid (`usePrecompiledHeaders` à essayer).
- **Push** : FCM gratuit sans plafond sur le plan Spark (**à relire** sur
  firebase.google.com/pricing), reçu par un APK sideloadé dès que les services Google sont
  présents ; envoyer en **priorité haute** sinon Doze retarde de minutes à heures. Expo
  Push Service (gratuit, 600/s) reste une option ; FCM HTTP v1 direct depuis l'Edge
  Function évite le jeton Expo.
- **Alarmes exactes** : `SCHEDULE_EXACT_ALARM` n'est ajoutée ni par le module ni par le
  config plugin d'`expo-notifications`, qui ne demande jamais l'autorisation et retombe en
  silence sur une alarme inexacte (fenêtre ≤ 1 h, jamais en Doze). Déclarer la permission
  dans `app.json`, ouvrir le réglage avec `expo-intent-launcher` quand une heure précise
  compte. `POST_NOTIFICATIONS` est une permission runtime à demander en contexte.
- **Widgets** : `react-native-android-widget` 0.22.1 (août 2026) est testé contre RN 0.83 et
  casse historiquement à chaque bump RN : à valider sur RN 0.86 au spike.
- Play Protect : « Installer quand même » ; aucun « paramètre restreint » n'est nécessaire.
- Rappels multiples DAILY avec l'app tuée : issue expo #40022 jamais résolue → un rappel
  « pilote » qui replanifie les suivants ; tester sur le modèle réel (Samsung/Xiaomi).

## 6. GitHub : le dépôt est public

Constaté le 06/09/2026 : `Thomas10112/nous` est **public**, hébergé sur Vercel. Conséquences :

| | Dépôt public (actuel) | Dépôt privé (si vous le passez en privé) |
| - | - | - |
| Minutes Actions | illimitées sur runners standard, macOS compris | 2 000 min/mois Linux, macOS ≈ 10× (≈ 200 min), blocage sans facture au-delà |
| Releases (APK) | téléchargeables par quiconque a le lien | connexion GitHub (collaborateur) ou jeton ; Obtainium accepte un jeton |
| Workflows planifiés | désactivés après 60 jours sans commit | règle documentée seulement pour les publics |
| Protection de branche | oui | non sur le plan gratuit |
| Code | lisible par tous : jamais de secret, `google-services.json` et keystore hors git | privé |

Dans les deux cas : 500 Mo d'artefacts partagés avec Packages (mettre `retention-days: 1`
sur tout artefact intermédiaire, jamais d'APK en artefact), cache 10 Go, Dependabot gratuit
et hors quota, runners auto-hébergés gratuits (frais reporté sine die : le PC du couple
peut servir de runner), `macos-26` = Xcode 26.6 = image EAS SDK 57 (épingler l'image et
`timeout-minutes: 40`, un job gelé peut consommer un mois). GitHub Pages n'est pas utile
(Vercel).

## 7. Notifications : ce qui part d'où

| Besoin | Android (APK) | iPhone PWA | iPhone natif sideloadé |
| ------ | ------------- | ---------- | ---------------------- |
| Rappel J-7 / J-1, habitude | notification locale planifiée (replanifiée à chaque ouverture, fenêtre glissante) | **serveur** : `pg_cron` → Edge Function → Web Push | notification locale (perdue à chaque re-signature) |
| Message du partenaire, proposition | FCM priorité haute via Edge Function (texte générique, contenu chargé par l'app) | Web Push (Declarative si iOS ≥ 18.4) + badge | **rien** (pas d'APNs) ; au mieux `BGAppRefreshTask` ≤ 30 s, fréquence non garantie |
| Temps réel | Realtime au premier plan, resync au retour | idem | idem |
| Limites | 64 notifications locales en attente (doc Apple historique) ; Doze | pas de push silencieux ; 4 Ko | idem Android + 7 jours |

ntfy.sh comme canal iOS a été écarté : quotas comptés par IP source (une Edge Function
partage son IP, 429 observés #1864), livraison iOS « best effort » (issues ouvertes 2025-
2026), contenu chez un tiers. Un reçu Expo/FCM « ok » ne prouve pas l'affichage : prévoir un
rattrapage à l'ouverture pour tout ce qui est notifié.

## 8. Les postes de dépense que personne n'avait vus

| Poste | Constat | Décision à 0 € |
| ----- | ------- | -------------- |
| **Cartes** | `MapPage.tsx` charge `basemaps.cartocdn.com/rastertiles` sans clé : CARTO filigrane ces requêtes et retire le raster. | MapLibre + tuiles vectorielles CARTO avec clé gratuite, ou OpenFreeMap (sans clé, à valider) ; cache de tuiles limité pour le hors-ligne. Spike carte avant le portage de la section. |
| **Géocodage** | Autocomplétion directe sur `nominatim.openstreetmap.org` sans User-Agent : interdit par la politique OSM (blocage par IP, donc par opérateur mobile). | Photon (komoot) ou géocodage CARTO ; recherche à la validation ; résultats mis en cache dans une table `places`. |
| **Polices** | Fraunces et Inter chargées depuis Google Fonts : casse le hors-ligne de la PWA. | Auto-héberger (licence OFL) sur le web et via `expo-font`. |
| **E-mails Auth** | SMTP Supabase intégré : 2/h et membres de l'organisation seulement ; un SMTP tiers exige un domaine. | Inviter les deux adresses dans l'organisation ; comptes créés une fois ; pas de lien magique vers l'extérieur. |
| **Domaine / HTTPS** | Web Push et installation PWA liés à l'origine. | `nous-ecru.vercel.app` conservé ; procédure de re-souscription si l'origine change. |
| **Cloudflare Access, R2, B2** | Moyen de paiement exigé (R2 : « checkout ») ou non vérifiable (B2, Access). | Écartés. Site public sans donnée, tout derrière Supabase Auth + RLS. |
| **Compte Expo** | EAS Update et les identifiants FCM reposent sur un compte gratuit dont Expo a changé les règles deux fois en 2026. | EAS Update = confort ; APK complet = secours ; jamais de dépendance à EAS Build. |
| **Supervision** | Sentry gratuit plausible mais non vérifié. | Table `client_errors` + rapport de sync, lus dans le tableau de bord Supabase. |
| **Sauvegardes** | 500 Mo d'artefacts GitHub ne tiennent pas 5 ans de dumps. | Dump chiffré hebdomadaire : dernier en artefact (7 jours), copie sur le PC du couple et Google Drive (15 Go). |
| **Temps humain iOS** | Re-signature hebdomadaire ≈ 20–45 h sur 5 ans, PC allumé ≈ 100 €/an d'électricité si Sideloadly/AltServer. | PWA. |
| **Profil de paiement Google** | Requis pour le compte « distribution limitée » (nom légal, adresse). | À accepter en 2027 ou passer par ADB. |
| **Remplacement de téléphone** | Re-sideload, quota 20 appareils, nouveau jeton FCM, SQLite perdu. | Tout se reconstruit depuis Supabase ; aucune donnée « appareil seulement » ; guide en 10 étapes. |
| **Cycle Expo** | ≈ 3 SDK par an, chaque majeure casse un module. | Une montée par an, sur le SDK N-1 ; builds indépendants d'EAS pour pouvoir rester sur un SDK ancien. |
| **Dérive des offres gratuites** | En un seul après-midi : CARTO retire le raster, GitHub bannit un keep-alive, Expo Go impose le login, Google impose la vérification 2027, Apple teste une vérification du sideload. | Adaptateurs dans `packages/data` (stockage, push, cartes, hébergement) ; revue trimestrielle des quotas ; provision de 2–5 jours par an. |

## 9. Ce que la contrainte change concrètement

1. **La règle 6 de la roadmap** (« un iPhone, un Android ») devient « Android principal ;
   iPhone = PWA à périmètre réduit, si iPhone il y a ». La règle 7 (budget EAS) devient
   « builds locaux / CI, EAS en secours ».
2. **Phase 1** : plus aucun prérequis payant ; le spike se construit via Expo Go sur les deux
   téléphones ; le compte Apple disparaît des « Fini quand ».
3. **Phase 2** : `keep-alive.yml` est remplacé par la RPC `ping()` dans l'app et par
   `backup.yml` ; `ci.yml` construit l'APK ; un Firebase Spark et un keystore unique sont
   créés ; les deux adresses sont invitées dans l'organisation Supabase.
4. **Phase 11** : politique médias (vignettes, originaux dans la galerie, vidéos ≤ 5 Mo).
5. **Phase 15** : FCM depuis l'Edge Function pour Android ; Web Push pour la PWA ; plus
   d'APNs ni d'`EXPO_ACCESS_TOKEN` obligatoire.
6. **Phase 16** : widgets Android seulement ; widgets iOS conditionnés à un spike natif
   concluant, sinon abandonnés.
7. **Phase 19** : plus de TestFlight ; Release GitHub + Obtainium ; compte « distribution
   limitée » ; pas de plan Pro.
8. **Variante iPhone** (si confirmé) : les phases 6, 8, 9, 10, 11, 12, 13, 14, 17 gagnent
   chacune un volet web (PWA), soit environ **+25 à +35 jours** sur l'estimation de la
   roadmap ([ROADMAP §7](ROADMAP.md#7-variante-iphone--la-pwa-comme-second-client)).
9. **Hors roadmap mais dès maintenant** : la carte et le géocodage du site v1 sont en
   sursis (§8) ; à traiter au portage de la section « carte ».

## 10. À vérifier à la main (pages bloquées pendant l'étude)

| Point | Où | Impact si faux |
| ----- | -- | -------------- |
| EAS gratuit : 30 builds/mois dont 15 iOS, délai max de build | expo.dev/pricing | aucun : EAS n'est qu'un secours |
| FCM gratuit sans plafond sur Spark | firebase.google.com/pricing | canal push Android à remplacer (Expo Push Service) |
| Profil de paiement Google sans carte pour le compte « distribution limitée » | console Android Developer, 2027 | repli ADB / advanced flow |
| Vercel Hobby : limites et clause non commerciale | vercel.com/docs/plans/hobby | Cloudflare Pages (`*.pages.dev`) |
| cron-job.org : quotas | cron-job.org/en/faq | le keep-alive repose alors sur l'app et la sauvegarde seules |
| Multiplicateur macOS sur les minutes incluses (dépôt privé seulement) | tableau de bord Billing après un job macOS | sans objet tant que le dépôt est public |
| Widget iOS via SideStore avec `expo-widgets` | test réel sur l'iPhone du couple | widgets iOS abandonnés |

## 11. Questions au couple

1. **Lequel de vous a un iPhone ?** Modèle et version d'iOS. Si aucun : tout ce document se
   réduit au cas Android, entièrement gratuit.
2. Si iPhone : acceptez-vous **par écrit** un client iPhone « second rang » (pas de widget,
   pas de notification native, temps réel app ouverte), c'est-à-dire la PWA ?
3. Le dépôt GitHub est **public** : le laisser ainsi (minutes illimitées, Releases sans
   jeton) ou le passer en privé ?
4. Un **profil de paiement Google** (nom légal + adresse, sans carte a priori) pour le
   compte Android « distribution limitée » en 2027 : acceptable ?
5. Votre **ordinateur** : Windows, Linux, Mac ? (Windows → WSL2 pour les builds Android.)
6. Un **Google Drive** (15 Go gratuits) peut-il recevoir la sauvegarde chiffrée
   hebdomadaire ?
7. Les originaux de vos photos et vidéos restent dans la **galerie du téléphone** (l'app ne
   garde que des vignettes et des photos compressées) : d'accord ?
