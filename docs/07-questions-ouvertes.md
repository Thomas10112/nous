# 07 — Questions ouvertes (à trancher avant ou pendant l'implémentation)

Les réponses par défaut sont celles que la roadmap suppose. Si une réponse change, la
phase concernée est indiquée.

## Produit

| # | Question | Défaut retenu | Phase |
| - | -------- | ------------- | ----- |
| Q1 | Un **événement personnel** est-il visible par l'autre ? (« Mimi : dentiste 15h ») | Oui, visible, en teinte de la personne ; pas de mode « privé » en v1. | 8 |
| Q2 | Une **activité refusée** : on la garde dans « Propositions » ou elle disparaît ? | Gardée 30 jours dans « Propositions » puis corbeille automatique. | 9 |
| Q3 | Qui peut **modifier une activité acceptée** ? Modifier rouvre-t-il une proposition ? | Les deux peuvent modifier ; changer date/heure/lieu crée une nouvelle proposition à valider par l'autre, le reste est libre. | 9 |
| Q4 | **Chapitres automatiques** : Avant / Journée / Soirée / Lendemain, à quelles heures ? | Avant = veille, Journée = 00:00–18:00, Soirée = 18:00–24:00, Lendemain = J+1. | 10 |
| Q5 | Un souvenir sans photo est-il permis ? | Oui (texte seul). | 11 |
| Q6 | **Vidéos** : limite de durée/taille ? | 3 min et 200 Mo après compression, au-delà on propose de couper. | 11 |
| Q7 | Habitude : quand les **deux** répondent différemment (« oui » puis « non ») ? | Le premier « oui » gagne (« un seul des deux suffit »), un « non » après un « oui » est ignoré avec un petit message. | 12 |
| Q8 | **Rattraper** une habitude : la date choisie crée-t-elle un événement dans le calendrier ? | Oui, un événement `personal`/`activity` lié (`source_habit_occurrence_id`), supprimable. | 12 |
| Q9 | Compte à rebours « dodos » : compte-t-on la nuit d'aujourd'hui ? (J-1 = « 1 dodo ») | Oui : `dodos = jours restants`, « C'est aujourd'hui » à 0. | 10 |
| Q10 | Messages : **suppression 5 min** — pour les deux ou seulement chez soi ? | Pour les deux (le message disparaît de la conversation). | 14 |
| Q11 | Présence : afficher l'écran précis (« regarde la galerie ») ou seulement « en ligne » ? Réglable ? | Précis par défaut, désactivable par personne dans Réglages → Présence. | 14 |
| Q12 | Statistiques : catégories « restaurant », « voyage » viennent des **catégories d'événement** ou d'une détection sur le lieu ? | Des catégories, choisies à la création (catalogue fixe + « autre »). | 13 |
| Q13 | Le **site web v1** doit-il rester utilisable pendant la transition ? | Oui, inchangé, sur la même base Supabase ; il ne verra pas les nouvelles données du calendrier. | 2 |
| Q14 | Les sections v1 (aventures, mots, Airbnb, carte, bucket, awards, capsules, moodboard) sont-elles attendues dans l'app mobile **dès la v1** ? | Non : après le calendrier, section par section (le moteur de sync les gère déjà). | hors roadmap |

## Technique / compte

| # | Question | Défaut retenu | Phase |
| - | -------- | ------------- | ----- |
| T1 | Le projet Supabase `nous` (eu-west-3) est **en pause** (`INACTIVE`) au moment de l'audit. Le réactiver, ou repartir sur un projet neuf ? | Réactiver (données v1 à conserver) ; les migrations sont écrites pour s'appliquer dessus. | 3 |
| T2 | Compte **Apple Developer** (99 €/an) disponible ? Nécessaire pour TestFlight/ad hoc et les widgets iOS. | Oui, à ouvrir avant la Phase 15. | 15–16 |
| T3 | Android : distribution par **APK direct** (lien privé) ou Play Console « tests internes » ? | APK via EAS Build (lien privé), Play Console seulement si besoin de mises à jour automatiques. | 19 |
| T4 | Push : **Expo Push Service** (simple, gratuit) ou FCM/APNs en direct ? | Expo Push Service, via une Edge Function Supabase. | 15 |
| T5 | Widgets iOS : **SwiftUI natif** (photo possible) ou `expo-widgets` (Expo UI, encore alpha, pas d'images) ? | SwiftUI natif via `@bacons/apple-targets`, données partagées par App Group. | 16 |
| T6 | Widgets Android : `react-native-android-widget` (config plugin Expo) ou Glance natif ? | `react-native-android-widget`. | 16 |
| T7 | Monorepo : **pnpm workspaces** (recommandé) ou npm workspaces ? | pnpm. | 2 |
| T8 | Les deux comptes existent-ils déjà dans Supabase Auth ? Quels `auth.uid()` ? (pour le script de migration `items` → `couples/profiles`) | À fournir. | 3 |
