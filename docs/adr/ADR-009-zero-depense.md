# ADR-009 — Zéro dépense : Android natif principal, iPhone en PWA, Supabase gratuit

**Statut** : proposé le 2026-09-06 ; **cas B confirmé le 2026-09-07** — les appareils sont
un **Galaxy S24 Ultra** (client React Native) et un **iPhone 16** (client PWA). Reste à
valider par le couple, après les deux spikes, le périmètre iPhone réduit
([09 §11](../09-zero-depense.md#11-questions-au-couple)).
**Remplace** les hypothèses payantes d'ADR-001 (compte Apple), ADR-006 (widgets iOS),
ADR-007 (APNs) et de la roadmap (règles 6 et 7, Phases 1, 2, 11, 15, 16, 19).

## Contexte

Le couple ne veut rien payer : ni abonnement ni achat unique. Une étude contradictoire
([09](../09-zero-depense.md), 22 agents, sources 2025-2026) établit que :

- Android tient tout le périmètre du brief à 0 € (APK sideloadé, widgets, push FCM,
  notifications locales, mises à jour par GitHub Release et EAS Update).
- iOS n'a **aucune voie native gratuite durable** : Apple ID gratuit = profils de 7 jours,
  3 apps, pas de push, pas de Sign in with Apple ; les sideloaders cassent à chaque version
  d'iOS ; EAS et le DMA exigent un compte payant. La PWA est gratuite, installable, avec
  Web Push, mais sans widget ni notification locale planifiée.
- Supabase gratuit suffit pour deux personnes à condition de ne jamais laisser le projet
  se mettre en pause et de réduire les médias.
- Plusieurs coûts cachés existaient déjà dans le web v1 (tuiles CARTO sans clé, Nominatim
  en autocomplétion, Google Fonts).

## Décision

1. **Android est la plateforme principale.** Tout le périmètre du brief y est livré.
2. **Si l'un des deux a un iPhone, son client est la PWA** (`apps/web`, Vite +
   `vite-plugin-pwa`, IndexedDB via Dexie, Web Push VAPID depuis une Edge Function), avec
   un périmètre réduit accepté par écrit : pas de widget, pas de notification locale sur
   l'appareil (les rappels partent du serveur), temps réel seulement app ouverte, gestes
   web. La voie native sideloadée (SideStore + Apple ID dédié) n'est qu'un **spike borné à
   deux jours** ; elle ne devient jamais le client principal.
3. **Supabase reste gratuit.** Le maintien en vie est une fonction du produit : RPC
   `ping()` appelée à chaque ouverture et dans la tâche de fond, sauvegarde hebdomadaire
   (`db dump` chiffré + export Storage) qui touche la base, cron externe en filet. Aucun
   keep-alive artificiel sur GitHub Actions (interdit par ses conditions d'utilisation).
4. **Médias** : l'app stocke des vignettes (≤ 200 Ko) et des photos compressées (≤ 1 Mo) ;
   les originaux et les vidéos restent dans la galerie du téléphone ; vidéos dans l'app
   ≤ 10 s / 5 Mo, purgées. Upload standard avec reprise applicative (pas de TUS). Aucun
   stockage tiers qui exige une carte (R2, B2).
5. **Builds et distribution** : builds Android locaux (Linux/WSL2) et en CI GitHub Actions ;
   un seul keystore, sauvegardé ; APK arm64-v8a signé publié en GitHub Release ; Obtainium
   sur les téléphones ; EAS Build en secours, EAS Update en confort. Compte Android
   « distribution limitée » (gratuit) enregistré dès son ouverture en France, avant 2027.
6. **Notifications** : Android via FCM (Firebase Spark) appelé par une Edge Function,
   priorité haute, texte générique ; rappels en notifications locales replanifiées.
   iPhone via Web Push (Declarative si iOS ≥ 18.4), rappels envoyés par `pg_cron`.
7. **Cartes et géocodage** : MapLibre avec tuiles vectorielles CARTO (clé gratuite) ou
   OpenFreeMap ; géocodage Photon ou CARTO, à la validation, mis en cache. Polices
   auto-hébergées.
8. **Comptes et dépôt** : les deux adresses invitées dans l'organisation Supabase (e-mails
   Auth) ; pas d'OAuth Apple ; dépôt public conservé sauf avis contraire du couple, sans
   aucun secret ; `google-services.json` et keystore hors git.
9. **Repli universel** : si la chaîne de sideload Android devient un jour impraticable
   (Advanced Protection imposé, vérification développeur étendue à l'installation directe,
   Auto Blocker verrouillé), **la PWA sert aussi sur le S24 Ultra**. Une web app installée
   par Chrome échappe à Auto Blocker, à Play Protect, à Advanced Protection et à la
   vérification développeur, et Chrome sur Android sait recevoir du Web Push. Ce que l'APK
   apporte en plus se réduit alors à trois choses, qui sont précisément les plus exposées :
   le widget d'écran d'accueil, les rappels exacts hors ligne, et la fluidité du geste à
   120 Hz. Le client web étant de toute façon construit pour l'iPhone, ce repli ne coûte
   rien de plus — c'est l'assurance du projet, et une raison de plus de soigner le spike web.
10. **Réversibilité** : tout est écrit derrière des adaptateurs (`packages/data` : stockage,
   médias, push, cartes). Si le couple accepte un jour les 99 €/an d'Apple, l'app RN se
   construit pour iOS avec push et widgets sans changer le domaine ni la sync ; si un plan
   Supabase Pro est accepté, la politique médias s'élargit par une constante.

## Conséquences

- La roadmap gagne une **variante iPhone** (§7) : +25 à +35 jours si la PWA est requise.
- Le spike de la Phase 1 se construit via **Expo Go** sur les deux téléphones ; dès la
  Phase 2, un build de développement Android local est obligatoire (`expo-notifications`
  plante Expo Go Android SDK 57).
- Le protocole deux téléphones (règle 6) devient : Android automatisé (Maestro), PWA
  iPhone par check-list manuelle.
- Les widgets iOS sortent du périmètre sauf spike natif concluant ; ADR-006 ne s'applique
  qu'à Android.
- Un Mac, s'il apparaît, ne change ni les entitlements ni les 7 jours : il ne sert qu'à
  produire le `.ipa` du spike et à ouvrir le simulateur.

## Alternatives rejetées

- **Payer 99 €/an Apple** : seule voie vers un iOS natif complet ; refusée par le couple.
  Reste l'unique arbitrage payant réellement utile, à représenter si l'avis change.
- **Expo Go comme runtime quotidien** : pas d'icône, pas de widgets, pas de push, un seul
  SDK, review App Store imprévisible, plantage d'`expo-notifications` sur Android.
- **ntfy.sh comme push iOS** : quotas par IP source, livraison iOS instable, contenu chez
  un tiers.
- **Cloudflare R2 / Backblaze B2 / Cloudflare Access** : carte bancaire exigée ou non
  vérifiable.
- **GitHub Pages** : inutile (Vercel) et impossible sur dépôt privé gratuit.
- **`keepalive-workflow` et cron GitHub Actions dédié** : contraire aux conditions
  d'utilisation, action désactivée par GitHub.
- **`react-native-web` pour la PWA** : bibliothèque en maintenance, gestes dégradés ;
  l'UI web est réécrite en React DOM sur le domaine partagé.
