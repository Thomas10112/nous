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
| Q6 | **Vidéos** : limite de durée/taille ? | **Politique zéro dépense** : l'app ne stocke que des vignettes et des photos compressées (≤ 1 Mo) ; les originaux et les vidéos restent dans la galerie du téléphone ; vidéos dans l'app ≤ 10 s / 5 Mo (recompressées côté client), purgées après 12 mois. `media.maxUploadBytes` = 5 Mo. | 11 |
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
| Q17 | Le **site sur PC** est-il encore utilisé ? | Oui, il reste en service sur `nous-ecru.vercel.app` (Vercel Hobby, gratuit, usage personnel). Si iPhone : ce site devient la **PWA** du partenaire iPhone ([09 §2.3](09-zero-depense.md)). | 2, 6+ |
| Q18 | **Import / export** de calendrier (Google, Apple, fichier `.ics`) souhaité ? | Non en v1 ; le moteur de récurrence sait exporter en RRULE si besoin plus tard. | — |
| Q19 | Un **thème** (clair/sombre) choisi par l'un doit-il s'appliquer à l'autre (comportement actuel) ? | Non : le thème devient par appareil ; seule la palette « surprise » reste partagée. | 6 |
| Q20 | Que doit **survivre à un téléphone perdu** ? | Tout ce qui est synchronisé ; les médias non encore envoyés sont perdus (état visible « N envois en attente »). | 11 |
| Q21 | Y a-t-il une **date butoir** (anniversaire, voyage) et combien d'heures par semaine pour le développement ? | Aucune supposée ; l'estimation de la roadmap est en jours de travail. | — |
| Q22 | Si iPhone : acceptez-vous **par écrit** un client iPhone de second rang (PWA : pas de widget, pas de notification locale sur l'appareil, temps réel app ouverte, gestes web) ? | Oui supposé ; l'alternative est 99 €/an chez Apple, refusée (T2). | 1, 6+ |
| Q23 | Les **originaux** de vos photos et vidéos restent dans la galerie du téléphone ; l'app ne garde que des vignettes et des photos compressées : d'accord ? | Oui supposé (1 Go de Storage gratuit). | 11 |

## Technique / compte

| # | Question | Défaut retenu | Phase |
| - | -------- | ------------- | ----- |
| T1 | Le projet Supabase `nous` (eu-west-3, créé le 14/08/2026, organisation sur le plan gratuit) est **en pause** (`INACTIVE`). Un projet en pause se restaure en un clic pendant **90 jours** seulement (ensuite : téléchargement de sauvegarde). Pendant la pause, le site web v1 est indisponible. | **Restauré le 06/09/2026** (`ACTIVE_HEALTHY`). Anti-pause dès la Phase 2 : RPC `ping()` dans l'app + `backup.yml` hebdomadaire ([09 §4](09-zero-depense.md)) ; plus jamais de pause (restaurations peu fiables). | 1 |
| T2 | Compte **Apple Developer** (99 €/an) ? | **Refusé le 06/09** (« je veux pas payer »). Conséquence ([09](09-zero-depense.md), ADR-009) : aucun iOS natif durable ; si iPhone, client **PWA** à périmètre réduit ; sideload natif = spike de 2 jours au plus. | 1–2 |
| T3 | Android : distribution par **APK direct** ou Play Console ? | APK arm64-v8a signé en **GitHub Release** (hors quota, 2 Gio/fichier) + Obtainium sur les téléphones ; jamais Play Console (25 $). En 2027 : compte Android « distribution limitée » (gratuit, 20 appareils, profil de paiement Google sans carte à confirmer). | 19 |
| T4 | Push : **Expo Push Service** ou FCM/APNs en direct ? | Android : **FCM HTTP v1 depuis l'Edge Function** (projet Firebase Spark, priorité haute), Expo Push Service en option équivalente. iOS : **Web Push** depuis la PWA (aucun programme Apple requis) ; pas d'APNs. | 15 |
| T5 | Widgets iOS : `expo-widgets` ou SwiftUI natif ? | **Hors périmètre** sans compte Apple : la PWA n'a pas de widget ; `expo-widgets` seulement si le spike natif sideloadé (App Groups, SideStore) tient sur l'iOS réel du couple, ce que le terrain 2026 rend improbable. Android : `react-native-android-widget` (à valider sur RN 0.86). | 16 |
| T6 | Widgets Android : `react-native-android-widget` (config plugin Expo) ou Glance natif ? | `react-native-android-widget`. | 16 |
| T7 | Monorepo : **pnpm workspaces** (recommandé) ou npm workspaces ? | pnpm. | 2 |
| T8 | Les deux comptes existent-ils déjà dans Supabase Auth ? Quels `auth.uid()` ? (pour le script de migration `items` → `couples/profiles`) | **Relevé le 06/09** ([08](08-mesures-phase1.md)) : `mimi@nous.local` = `c95c9aac…`, `moncoeur@nous.local` = `8d1e917f…`. Mapping proposé `p1 (mimi) → c95c9aac…`, `p2 (mimine) → 8d1e917f…` — **à confirmer**. | 3 |
| T10 | **Appareils réels** du couple : modèles, versions d'OS, taux de rafraîchissement (60/120 Hz), version de la WebView Android. Conditionne le spike de la Phase 1 et les tests de performance. | À fournir en Phase 1. | 1 |
| T11 | Un **Mac** est-il disponible ? | Non supposé. Depuis le 06/09 : un Mac **ne change rien** à iOS sans compte payant (mêmes 7 jours, mêmes entitlements) ; il servirait seulement de runner macOS et de simulateur. Sans Mac : `.ipa` du spike sur runner `macos-26` GitHub (illimité tant que le dépôt est public). | 1, 5, 18 |
| T12 | **Projet Firebase** (gratuit) pour les pushs Android. | À créer en Phase 2 (`google-services.json` hors git, injecté par secret Actions ; clé de compte de service en secret Supabase). Pas de clé APNs. Empreinte SHA-256 du keystore de release déclarée dans Firebase (un APK signé debug ne reçoit pas de jeton). | 2, 15 |
| T9 | **Plan Supabase** : gratuit ou Pro ? | **Gratuit, sans limite de durée.** Volumes mesurés le 06/09 : 4,4 Ko de données, 435 Ko de photos ([08](08-mesures-phase1.md)). Règles : ne jamais laisser le projet se mettre en pause (`ping()` dans l'app + sauvegarde hebdomadaire), médias réduits (vignettes, originaux dans la galerie, vidéos ≤ 5 Mo), base < 400 Mo, egress surveillé ([09 §4](09-zero-depense.md)). | 1, 11, 19 |
| T13 | **Lequel de vous a un iPhone ?** Modèle et version d'iOS (Web Push exige ≥ 16.4, Declarative Web Push ≥ 18.4, drag web fiable ≥ 26.5). | Sans réponse, la roadmap suppose le cas A (deux Android). | 1 |
| T14 | Le dépôt GitHub est **public** (constaté le 06/09). Le laisser ainsi (minutes Actions illimitées, Releases sans jeton) ou le passer en privé (2 000 min/mois, jeton pour l'APK) ? | Public conservé ; aucun secret dans git. | 2 |
| T15 | **Profil de paiement Google** (nom légal + adresse) pour le compte Android « distribution limitée » en 2027 : acceptable ? | Oui supposé ; sinon ADB ou « advanced flow » pour les mises à jour. | 19 |
| T16 | **Ordinateur de développement** : Windows, Linux, Mac ? | Windows supposé → WSL2 pour les builds Android release (Hermes V1 fragile sous Windows natif). | 2 |
| T17 | **Sauvegardes** : un Google Drive (15 Go) peut-il recevoir le dump chiffré hebdomadaire, en plus du PC ? | Oui supposé ; dernier dump aussi en artefact GitHub (7 jours). | 2, 19 |
