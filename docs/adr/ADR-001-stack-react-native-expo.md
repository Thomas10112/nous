# ADR-001 — Stack mobile : React Native + Expo + TypeScript

**Statut** : proposé, **en attente de validation** · **Date** : 2026-09-06 · **Phase** : 1

## Contexte

Nous est une SPA React + TypeScript + Vite adossée à Supabase (audit : [00](../00-audit.md)).
Le brief exige une **vraie application mobile** (téléphone d'abord, gestes, widgets
système, push, hors ligne complet, présence temps réel), un calendrier tactile à grille
de 30 minutes, et l'identité visuelle de Nous. Le développeur est seul, assisté par IA.
Le site web doit rester utilisable pendant la transition.

Le brief demande de privilégier React Native + Expo si React + TypeScript peut être
conservé proprement, mais de proposer autre chose si une stack est objectivement bien
plus adaptée. Comparatif complet : [01-stack.md](../01-stack.md).

## Décision

**React Native + Expo (SDK 57 au moment de la décision, épinglé à la création du projet)
+ TypeScript**, avec Supabase conservé comme backend — assorti d'une **porte de décision**
(§ Conséquences).

Justification, par ordre d'importance :

1. **Le calendrier tactile** se construit de la même façon en RN et en Flutter (logique
   pure + gestes sur le thread UI), et **ne peut pas** se construire correctement dans une
   WebView. RN + Reanimated 4 + Gesture Handler donne des gestes natifs, des springs aux
   mêmes paramètres que framer-motion, et le respect de reduced-motion intégré.
2. **Réutilisation réelle** : types, dates (corrigées), utils, connexion par surnom,
   tokens, chemins d'icônes, contrats de props, machine d'états de geste, vocabulaire
   d'animation — environ 12 à 15 % des lignes actuelles (mesuré par la contre-expertise,
   pas 30 %), et surtout **100 % de la logique métier future** partagée avec le web via
   `packages/domain`. Flutter jetterait tout.
3. **Un seul langage** pour un développeur seul : TypeScript partout (app, domaine,
   Edge Functions Supabase, scripts). Les modules natifs se limitent aux widgets.
4. **Supabase depuis RN** est un cas standard : `supabase-js`, Realtime (presence,
   broadcast), Storage, Auth avec `expo-secure-store` ; les pushs passent par Expo Push
   Service depuis une Edge Function.
5. **Écosystème 2026** : Expo SDK 57 (RN 0.86, React 19.2, New Architecture par défaut,
   Hermes v1, XCFrameworks pré-compilés, montée « sans rupture » depuis SDK 56), Expo
   Router, `expo-sqlite` mûr avec Drizzle, EAS pour les builds et la distribution privée
   (TestFlight interne, APK).

## Contre-expertise

Deux juges indépendants ont classé les trois options : la lentille « risque d'ingénierie
pour un dev seul » préfère l'hybride Capacitor (73) à RN (69) pour son mode d'échec
moins cher ; la lentille « qualité produit sur téléphone » préfère RN (79) à Flutter (74)
et à l'hybride (60) à cause du plafond de 60 Hz sur le thread principal de la WebView.
Détail et arguments contestés dans [01-stack.md §6](../01-stack.md). La décision retient
la seconde lentille parce que c'est celle du brief, et répond à la première par la porte
de décision ci-dessous.

## Alternatives écartées

- **Flutter** : meilleur rendu et animations « gratuites », mais réécriture totale en
  Dart, deux langages à maintenir, aucun partage avec le web. Gain marginal pour ce
  produit, coût structurel permanent.
- **Hybride (Capacitor sur le site actuel)** : réutilisation quasi totale et livraison
  rapide, mais calendrier drag & drop en WebView, gestes système absents, stockage
  IndexedDB évictable sur iOS, widgets sans lien avec l'app, et une dette CSS mobile
  (D13–D19) à porter quand même. C'est précisément le « site web rendu responsive » que
  le brief refuse.

## Conséquences

- **Porte de décision en Phase 1** : un spike de deux semaines (vue Semaine 48 × 7 avec
  long-press, drag sur worklet, redimensionnement, pinch, scroll qui ne se bat pas avec
  le drag) sur build de développement installé sur les deux téléphones du couple, avec
  des critères mesurables (60 fps soutenus, aucun geste perdu sur 50 essais, clavier
  stable). Le domaine et le moteur de sync sont écrits en TypeScript pur avant le spike et
  lui survivent quelle que soit l'issue.
- **Tout le rendu est réécrit** (le kit web est DOM/CSS/framer-motion). C'est assumé :
  c'était nécessaire de toute façon pour le tactile.
- **Builds de développement** obligatoires (modules natifs) : pas d'Expo Go. Un compte
  Apple Developer (99 €/an) est requis pour iOS et les widgets.
- **Discipline de versions** : une montée de SDK par an, alignée sur Reanimated / gorhom /
  compresseur ; `expo doctor` en CI.
- **Un peu de natif** (Swift pour WidgetKit, config Android) isolé dans
  `apps/mobile/targets` et `apps/mobile/native`.
- Le site web v1 est **gelé** et continue de tourner (ADR-002) ; il consomme les
  paquets partagés pour prouver la non-régression.

## Ce qui ferait revoir la décision

Voir [01-stack.md §5](../01-stack.md) : équipe Dart, exigence de livraison immédiate sans
calendrier tactile, ou rupture de compatibilité des modules natifs sans alternative.
