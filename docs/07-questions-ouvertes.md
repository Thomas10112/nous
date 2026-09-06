# 07 — Questions ouvertes (à trancher avant ou pendant l'implémentation)

Les réponses par défaut sont celles que la roadmap suppose. Si une réponse change, la
phase concernée est indiquée.

## Produit

| # | Question | Défaut retenu | Phase |
| - | -------- | ------------- | ----- |
| Q1 | Un **événement personnel** est-il visible par l'autre ? (« Mimi : dentiste 15h ») | Oui, visible, en teinte de la personne ; pas de mode « privé » en v1. | 8 |
| Q2 | Une **activité refusée** : on la garde dans « Propositions » ou elle disparaît ? | Gardée 30 jours dans « Propositions », puis mise à la corbeille par `purge_trash()` (à l'ouverture de l'app), puis purgée 30 jours plus tard. | 9 |
| Q3 | Qui peut **modifier une activité acceptée** ? Modifier rouvre-t-il une proposition ? | Les deux peuvent modifier ; changer date/heure/lieu crée une nouvelle proposition à valider par l'autre, le reste est libre. | 9 |
| Q4 | **Chapitres automatiques** : Avant / Journée / Soirée / Lendemain, à quelles heures ? | Avant = veille, Journée = 00:00–18:00, Soirée = 18:00–24:00, Lendemain = J+1. | 10 |
| Q5 | Un souvenir sans photo est-il permis ? | Oui (texte seul). | 11 |
| Q6 | **Vidéos** : limite de durée/taille ? | 3 min et 200 Mo après compression, au-delà on propose de couper. | 11 |
| Q7 | Habitude : quand les **deux** répondent différemment (« oui » puis « non ») ? | Le premier « oui » gagne (« un seul des deux suffit ») : `done` est absorbant côté serveur et côté domaine, quel que soit l'ordre d'arrivée ; un « non » après un « oui » est ignoré avec un petit message. | 12 |
| Q8 | **Rattraper** une habitude : la date choisie crée-t-elle un événement dans le calendrier ? | Oui, un événement `personal`/`activity` lié (`source_habit_occurrence_id`), supprimable. | 12 |
| Q9 | Compte à rebours « dodos » : compte-t-on la nuit d'aujourd'hui ? (J-1 = « 1 dodo ») | Oui : `dodos = jours restants`, « C'est aujourd'hui » à 0. | 10 |
| Q10 | Messages : **suppression 5 min** — pour les deux ou seulement chez soi ? | Pour les deux (le message disparaît de la conversation). | 14 |
| Q11 | Présence : afficher l'écran précis (« regarde la galerie ») ou seulement « en ligne » ? Réglable ? | Précis par défaut, désactivable par personne dans Réglages → Présence. | 14 |
| Q12 | Statistiques : catégories « restaurant », « voyage » viennent des **catégories d'événement** ou d'une détection sur le lieu ? | Des catégories, choisies à la création (catalogue fixe + « autre »). | 13 |
| Q13 | Le **site web v1** doit-il rester utilisable pendant la transition ? | Oui, inchangé, sur la même base Supabase ; il ne verra pas les nouvelles données du calendrier. | 2 |
| Q14 | Les sections v1 (aventures, mots, Airbnb, carte, bucket, awards, capsules, moodboard) sont-elles attendues dans l'app mobile **dès la v1** ? | Non : après le calendrier, section par section (le moteur de sync les gère déjà). | hors roadmap |

| Q15 | Une **proposition en attente** expire-t-elle ? Combien de contre-propositions au plus ? | Pas d'expiration ; rappel doux à J-1 de la date proposée ; tours illimités. | 9 |
| Q16 | Vivez-vous dans le **même fuseau** ? Voyagez-vous souvent ? Durée typique hors ligne (métro, étranger) ? | Même fuseau, hors ligne < 24 h ; le modèle stocke le fuseau par événement quand même. | 3, 5 |
| Q17 | Le **site sur PC** est-il encore utilisé ? Quelles sections v1 comptent vraiment (carte, moodboard) ? | Oui, il reste en service ; sections v1 portées après le calendrier. | 2, hors roadmap |
| Q18 | **Import / export** de calendrier (Google, Apple, fichier `.ics`) souhaité ? | Non en v1 ; le moteur de récurrence sait exporter en RRULE si besoin plus tard. | — |
| Q19 | Un **thème** (clair/sombre) choisi par l'un doit-il s'appliquer à l'autre (comportement actuel) ? | Non : le thème devient par appareil ; seule la palette « surprise » reste partagée. | 6 |
| Q20 | Que doit **survivre à un téléphone perdu** ? | Tout ce qui est synchronisé ; les médias non encore envoyés sont perdus (état visible « N envois en attente »). | 11 |
| Q21 | Y a-t-il une **date butoir** (anniversaire, voyage) et combien d'heures par semaine pour le développement ? | Aucune supposée ; l'estimation de la roadmap est en jours de travail. | — |

## Technique / compte

| # | Question | Défaut retenu | Phase |
| - | -------- | ------------- | ----- |
| T1 | Le projet Supabase `nous` (eu-west-3) est **en pause** (`INACTIVE`) au moment de l'audit. Le réactiver, ou repartir sur un projet neuf ? | Réactiver (données v1 à conserver) ; les migrations sont écrites pour s'appliquer dessus. | 3 |
| T2 | Compte **Apple Developer** (99 €/an) disponible ? Nécessaire dès le premier build de développement sur un iPhone physique (Phase 2), puis pour TestFlight/ad hoc et les widgets. | Oui, **prérequis de la Phase 1**. Sinon : Android d'abord, à écrire dans la règle 6. | 1–2 |
| T3 | Android : distribution par **APK direct** (lien privé) ou Play Console « tests internes » ? | APK via EAS Build (lien privé), Play Console seulement si besoin de mises à jour automatiques. | 19 |
| T4 | Push : **Expo Push Service** (simple, gratuit) ou FCM/APNs en direct ? | Expo Push Service, via une Edge Function Supabase. | 15 |
| T5 | Widgets iOS : `expo-widgets` (Expo UI, sans Swift) ou **SwiftUI natif** via `@bacons/apple-targets` ? Les sources divergent sur la capacité d'`expo-widgets` à afficher une image locale. | Prototype `expo-widgets` de deux jours en Phase 16 ; SwiftUI natif si la photo ne passe pas. Le snapshot (ADR-006) est le même dans les deux cas. | 16 |
| T6 | Widgets Android : `react-native-android-widget` (config plugin Expo) ou Glance natif ? | `react-native-android-widget`. | 16 |
| T7 | Monorepo : **pnpm workspaces** (recommandé) ou npm workspaces ? | pnpm. | 2 |
| T8 | Les deux comptes existent-ils déjà dans Supabase Auth ? Quels `auth.uid()` ? (pour le script de migration `items` → `couples/profiles`) | À fournir. | 3 |
| T10 | **Appareils réels** du couple : modèles, versions d'OS, taux de rafraîchissement (60/120 Hz), version de la WebView Android. Conditionne le spike de la Phase 1 et les tests de performance. | À fournir en Phase 1. | 1 |
| T11 | Un **Mac** est-il disponible ? (EAS Build n'en a pas besoin ; Xcode reste utile pour les widgets.) | Non supposé ; EAS pour tout, Xcode seulement en Phase 16 si nécessaire. | 2, 16 |
| T9 | **Plan Supabase** : le gratuit met le projet en pause après 7 jours sans requête, limite le Storage à 1 Go (photos v1 + vidéos) et réserve le *branching* au plan Pro (25 $/mois). Rester gratuit avec un `keep-alive` et des tests locaux, ou passer Pro ? | Gratuit + keep-alive + tests locaux jusqu'à la Phase 11 ; décision Pro avant les vidéos selon le volume mesuré en Phase 1. | 1, 11, 19 |
