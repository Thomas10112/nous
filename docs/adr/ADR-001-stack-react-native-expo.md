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

**React Native + Expo (SDK 56) + TypeScript**, avec Supabase conservé comme backend.

Justification, par ordre d'importance :

1. **Le calendrier tactile** se construit de la même façon en RN et en Flutter (logique
   pure + gestes sur le thread UI), et **ne peut pas** se construire correctement dans une
   WebView. RN + Reanimated 4 + Gesture Handler donne des gestes natifs, des springs aux
   mêmes paramètres que framer-motion, et le respect de reduced-motion intégré.
2. **Réutilisation réelle** : types, dates (corrigées), utils, connexion par surnom,
   tokens, chemins d'icônes, contrats de props, machine d'états de geste, vocabulaire
   d'animation — environ 30 % du projet, et surtout **100 % de la logique métier future**
   partagée avec le web via `packages/domain`. Flutter jetterait tout.
3. **Un seul langage** pour un développeur seul : TypeScript partout (app, domaine,
   Edge Functions Supabase, scripts). Les modules natifs se limitent aux widgets.
4. **Supabase depuis RN** est un cas standard : `supabase-js`, Realtime (presence,
   broadcast), Storage, Auth avec `expo-secure-store` ; les pushs passent par Expo Push
   Service depuis une Edge Function.
5. **Écosystème 2026** : Expo SDK 56 (RN 0.85, React 19.2, New Architecture par défaut,
   Hermes v1, XCFrameworks pré-compilés), Expo Router, `expo-sqlite` mûr avec Drizzle,
   EAS pour les builds et la distribution privée (TestFlight interne, APK).

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
