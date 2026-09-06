# 01 — Choix de la stack mobile

> Statut : **proposition à valider** (Phase 1). Décision détaillée dans
> [ADR-001](adr/ADR-001-stack-react-native-expo.md). Ce document compare trois options
> sur les seize critères imposés, à partir du code réel de Nous et de l'état de
> l'écosystème en septembre 2026.

## 1. Les trois options sérieuses

| | A. React Native + Expo | B. Flutter | C. Hybride (Capacitor autour du site actuel) |
| - | - | - | - |
| Langage | TypeScript (le même) | Dart (nouveau) | TypeScript (le même) |
| Rendu | Vues natives (New Architecture, RN 0.85, Hermes v1) | Moteur Impeller (dessin propre) | WebView système |
| Réutilisation du code v1 | Lignes identiques ≈ 7 % (types, utils, login, icônes, tokens, SQL), logique portée ≈ 12–15 % ; tout le rendu est réécrit ; **100 % de la logique future** partagée | **≈ 0 %** de code, seulement les idées | **≈ 85 %** des lignes tel quel, mais ≈ 0 % du livrable calendrier, et les dettes D13–D19 à corriger dans le CSS |
| Supabase | `supabase-js` (déjà maîtrisé) : Auth, PostgREST, Realtime (presence, broadcast), Storage | `supabase_flutter` : complet | `supabase-js` |
| Base locale | `expo-sqlite` + Drizzle (réactivité par `enableChangeListener`) | `drift` / `sqlite3` : excellent | IndexedDB dans la WebView (éviction possible sur iOS) ou plugin SQLite |
| Widgets | Code natif Swift/Kotlin quoi qu'il arrive ; `@bacons/apple-targets`, `react-native-android-widget` ; `expo-widgets` (alpha, iOS, sans images) | `home_widget` (mûr, mais natif quand même pour la vue) | Natif pur, aucun partage avec la WebView |
| Push | `expo-notifications` + Expo Push Service (FCM v1 / APNs gérés) | `firebase_messaging` | Plugin Capacitor Push + FCM/APNs à câbler |
| Gestes / animations | Reanimated 4 + Gesture Handler : thread UI, springs identiques à framer-motion | Excellent, natif au framework | Pointer Events dans une WebView : latence, conflits de scroll, pas de gestes système |
| Distribution privée | EAS Build → TestFlight interne / ad hoc, APK | Xcode/Gradle → idem | idem |
| Écosystème 2026 | Expo SDK 57 (juin 2026 : RN 0.86, React 19.2, montée « sans rupture » depuis SDK 56), Expo Router, `@expo/ui` (SwiftUI/Compose) | Flutter 3.4x stable (Impeller partout) | Capacitor 8 (Xcode 26, SPM) ; `@capacitor-community/sqlite` porté par la communauté |

## 2. Notation sur les seize critères (1 = faible, 5 = excellent)

| # | Critère | A. RN + Expo | B. Flutter | C. Hybride | Commentaire |
| - | ------- | :-: | :-: | :-: | ----------- |
| 1 | Offline-first (base locale, requêtes réactives, outbox) | 4 | 5 | 3 | A : SQLite natif + Drizzle, moteur maison (ADR-005). C : le moteur TS est le même, mais SQLite passe par un pont (base64, latence) et le reste de la WebView est évictable. |
| 2 | Temps réel Supabase (postgres_changes, presence, broadcast) | 5 | 5 | 5 | Même client JS pour A et C. |
| 3 | Push iOS/Android | 5 | 4 | 3 | A : Expo Push Service masque FCM/APNs. |
| 4 | Widgets système | 4 | 3 | 3 | Natif dans tous les cas ; A a des ponts prêts (expo-widgets à valider, apple-targets, android-widget). C : plugin maison, rien de partagé avec la WebView. |
| 5 | Performances listes/grilles | 4 | 5 | 3 | A : FlashList, vues natives, Hermes v1. C : DOM dans WebView, `requestAnimationFrame` et `pointermove` plafonnés à 60 Hz sur le thread principal. |
| 6 | Animations, gestes, reduced-motion | 4 | 5 | 3 | A : Reanimated worklets sur thread UI, `ReduceMotion` intégré. C : framer-motion anime en composited, mais un drag piloté par `pointermove` reste à 60 Hz. |
| 7 | Calendrier tactile (grille 30 min, drag, resize, multi-jours) | 4 | 4 | 2 | Aucune bibliothèque ne convient à l'identité Nous (ADR-003) ; A et B écrivent la même logique ; C doit arbitrer scroll ↔ drag, autoscroll et clavier à la main, et reste plafonné. |
| 8 | Stockage local (SQLite, MMKV, fichiers, cache images) | 4 | 5 | 3 | |
| 9 | iOS (build, TestFlight, distribution à 2) | 4 | 4 | 4 | EAS simplifie A (pas de Mac) ; les trois ont besoin d'un compte développeur. |
| 10 | Android (build, APK) | 5 | 5 | 4 | |
| 11 | Réutilisation du TypeScript existant | 3 | 1 | 5 | A : ≈ 12–15 % des lignes actuelles (types, dates, utils, login, tokens, icônes, contrats, machine de geste) mais 100 % de la logique métier **future** partagée. C : ≈ 85 % des lignes, mais ≈ 0 % du livrable calendrier. |
| 12 | Identité visuelle Nous (Fraunces/Inter, tokens, grain, palettes) | 4 | 4 | 5 | A : tokens en TS, polices embarquées (axes variables perdus, aujourd'hui inertes), grain en tuile, palettes animées. |
| 13 | Maintenabilité pour un dev seul + IA | 5 | 2 | 3 | A : un langage, un écosystème très documenté, IA très efficace en TS/RN, mais ≈ 10 modules natifs à réaligner à chaque montée de SDK (une par an). B : deux langages. C : web + natif à écrire à la main, dette CSS mobile à porter. |
| 14 | Vidéo (lecture, compression, upload) | 4 | 4 | 3 | A : expo-video, react-native-compressor. C : compresseur natif maison. |
| 15 | Messagerie + présence | 5 | 5 | 4 | |
| 16 | Desktop / web plus tard | 4 | 3 | 5 | A : Expo web possible, et `packages/domain` sert au web actuel. C : le calendrier arrive sur PC en même temps. |
| | **Total /80** | **68** | **64** | **58** | |

Le total ne décide pas seul : les critères qui **tranchent** pour ce projet sont 7
(calendrier tactile), 5–6 (fluidité et gestes), 13 (dev seul) et 12 (identité). Sur les
trois premiers, A domine ; B ne perd que sur 11 et 13, mais y perd lourdement ; C gagne
11, 12 et 16 mais bute sur 5, 6 et 7 — et le brief exclut explicitement « un site web
rendu responsive ».

> Les notes de l'hybride ont été **relevées** après la contre-expertise (§6) : la première
> version de ce tableau lui donnait 2 partout où le moteur TS ou un plugin SQLite
> rendent la chose faisable. L'écart avec A passe de 16 à 10 points ; la décision tient
> sur les critères qui tranchent, pas sur le total.

## 3. Ce que chaque option coûterait vraiment

**A. React Native + Expo.** On garde le TypeScript, Supabase, le moteur de geste du
Moodboard (en logique), les tokens et les icônes. On réécrit tout le rendu (c'était de
toute façon nécessaire : le kit web est 100 % DOM/CSS/framer-motion, D13–D19). On
apprend Reanimated/Gesture Handler et un peu de Swift/Kotlin pour les widgets. Les
pièges connus : versions à aligner (Expo SDK ↔ Reanimated ↔ gorhom), builds de
développement obligatoires (pas Expo Go dès qu'on a des modules natifs), taille
d'équipe = 1 donc discipline sur les mises à jour SDK (une par an suffit).

**B. Flutter.** Le meilleur rendu et les meilleures animations « gratuites », mais
**tout** se réécrit en Dart, y compris la logique métier qu'on vient d'identifier comme
réutilisable, et le site web v1 ne partagerait plus rien avec l'app. Pour un
développeur seul qui maîtrise TypeScript, c'est doubler la surface à maintenir pour un
gain marginal sur un calendrier de couple.

**C. Hybride.** Le plus rapide à « montrer » (quelques jours) et le pire à « finir » :
un calendrier drag & drop à 30 minutes dans une WebView reste un site web ; les gestes
système, la sheet native, la fluidité sur Android modeste, le stockage fiable et les
widgets exigent quand même du natif. On paierait la dette CSS mobile (D13–D19) **et** le
pont natif, pour un résultat que le brief refuse.

## 4. Décision

**React Native + Expo + TypeScript** (option A), avec :

- Expo SDK 57 (React Native 0.86, React 19.2, New Architecture, Hermes v1), Expo Router —
  version **épinglée au moment de `create-expo-app`**, jamais planifiée sur un numéro ;
- `expo-sqlite` + Drizzle ORM ; MMKV pour les préférences ; `expo-secure-store` pour la session ;
- `supabase-js` v2 ; Realtime *Broadcast from Database* + Presence ; Edge Functions pour
  les pushs et la purge ;
- Reanimated 4 + Gesture Handler ; `@gorhom/bottom-sheet` v5 (ADR-008) ; `expo-image`,
  `expo-video`, `react-native-compressor`, `expo-image-picker` ; `react-native-svg` ;
  `expo-haptics`, `expo-blur`, `expo-notifications` ;
- TanStack Query + Zustand (état d'interface) ;
- widgets natifs via `@bacons/apple-targets` et `react-native-android-widget` (ADR-006) ;
- EAS Build/Submit, TestFlight interne + APK privé ;
- Vitest, Maestro, GitHub Actions.

Ce que l'on **n'utilise pas** dans le chemin critique : `@expo/ui` et `expo-widgets`
(alpha en 2026 ; réévalués en Phase 17), `@howljs/calendar-kit` (ADR-003), PowerSync /
WatermelonDB / Legend-State (ADR-005).

## 5. Dans quel cas on changerait d'avis

- Si le couple voulait **d'abord** une version mobile « pour hier » et acceptait un
  calendrier sans drag & drop ni widgets : C serait un pont raisonnable — mais le brief
  dit l'inverse.
- Si l'équipe devenait plusieurs développeurs Dart : B redeviendrait crédible.
- Si Expo cassait la compatibilité des modules natifs utilisés (widgets, compresseur)
  sans alternative : on isolerait ces modules en natif maison (ADR-006 le prévoit).
- Si le **spike de la Phase 1** (§6) échouait sur la coordination scroll ↔ drag.

## 6. Contre-expertise : deux juges, un désaccord instructif

Trois dossiers d'avocats (un par stack) ont été soumis à deux juges indépendants.

| Lentille | Classement | Argument central |
| -------- | ---------- | ---------------- |
| **Risque d'ingénierie, dev seul, 2–3 ans** | Hybride 73 · RN 69 · Flutter 54 | Le cœur du brief (grille, sync, messagerie, widgets) se code de zéro dans les trois stacks ; ce qui diffère est le coût de *tout le reste* (kit, CSS, pages, plomberie native), quasi nul en hybride. Mode d'échec le moins cher : si l'hybride déçoit, on bascule vers RN en gardant domaine, données et SQL ; si la réécriture RN s'enlise, il n'y a pas de repli. |
| **Qualité produit sur téléphone** | RN 79 · Flutter 74 · Hybride 60 | Un drag piloté par `pointermove` dans WKWebView est plafonné à 60 Hz sur le thread principal, sans contournement ; pas de pile native ni de swipe-back ; clavier iOS à dompter dans la messagerie. Le brief refuse un site rendu responsive : c'est un risque de perception que l'on ne lève pas en codant mieux. |

Ce que les deux juges ont **contesté** dans les dossiers, et que ce document corrige :
la réutilisation RN annoncée à 25–30 % vaut 12–15 % (lignes portées) ; les notes de
l'hybride étaient trop sévères (relevées, §2) ; `expo-widgets` pourrait afficher une
image locale et éviter Swift sur iOS (à vérifier en Phase 16, ADR-006) ; les numéros de
version ne se planifient pas (SDK 57 existe, « sans rupture », épingler au démarrage).

**Décision maintenue : A**, parce que le brief place la qualité tactile et le « vraie
application » au-dessus du coût de portage, et parce que le plafond de la WebView est
structurel là où le risque RN est un risque de finition. Mais le désaccord du premier
juge est pris au sérieux par une **porte de décision** :

- **Phase 1 contient un spike de deux semaines** : vue Semaine 48 créneaux × 7 jours sur
  build de développement EAS, installée sur les deux téléphones réels — long-press →
  soulèvement haptique → drag sur worklet → accrochage 30 min → redimensionnement par
  poignée → pinch de hauteur de créneau, avec un scroll vertical qui ne se bat pas avec
  le drag. Critères mesurables : 60 fps soutenus pendant le drag sur l'Android du couple
  (120 sur l'iPhone si l'écran le permet), aucun geste perdu sur 50 essais, clavier de
  la messagerie sans saut, jugé par le couple et non par le développeur.
- Le domaine (`packages/domain`) et le moteur de sync sont écrits en TypeScript pur
  **avant** ce spike et lui survivent : si le spike échoue, ils se réutilisent tels quels
  dans l'hybride (Capacitor) ou se transposent en Dart. La perte se limite à ≈ 10 jours.
