# ADR-007 — Notifications : locales pour le prévisible, push serveur pour l'inter-personnes

**Statut** : proposé · **Date** : 2026-09-06 · **Phases** : 10 (planificateur local et `LocalScheduler`, pour les rappels J-7 / J-1), 12 (relances d'habitude), 15 (push serveur)

## Contexte

Familles de notifications : messages, propositions (et réponses), habitudes
(« Alors, vous l'avez fait ? »), dates importantes (J-7, J-1, jour J). Toutes doivent
pouvoir être désactivées/configurées. Le calendrier fonctionne hors ligne.

## Décision

- **Notifications locales** (programmées sur l'appareil, `expo-notifications`) pour tout
  ce que l'appareil peut **prévoir seul** à partir de ses données : rappels de comptes à
  rebours, relance d'habitude à `time_of_day + ask_after`, rappel avant une activité.
  Un service `NotificationScheduler` (domaine) recalcule le plan à chaque changement de
  données et à chaque ouverture ; il programme au plus 60 notifications (limite iOS = 64)
  dans un horizon glissant de 14 jours.
- **Push serveur** (table `notifications` → webhook → Edge Function → Expo Push Service)
  pour ce qui vient **de l'autre** : message, proposition, réponse, « Mimi a fait
  l'habitude » (qui annule la relance locale chez l'autre), « Mimine a ajouté des photos
  à votre anniversaire ».
- **Préférences** : une ligne `notification_preferences` par personne, lue côté client
  (planification locale) et côté serveur (fonction d'envoi). Heures calmes appliquées aux
  deux. Les rappels J-7 / J-1 et leur heure appartiennent à **la date** elle-même
  (`important_moments.reminder_days/reminder_time`), pas à un compte à rebours.
- **La table `notifications` n'est jamais écrite par le client** : les services de
  domaine ne la connaissent pas ; seuls les triggers serveur (Phase 15) y insèrent.
- **Suppression en double** : si l'app est au premier plan sur l'écran concerné, le push
  est affiché en bulle interne, pas en bannière système.

## Conséquences

- Aucune dépendance au serveur pour les rappels quotidiens ; un téléphone en mode avion
  reçoit quand même « Encore 1 dodo ».
- Deux appareils du même compte reçoivent chacun leurs notifications locales : on
  dédoublonne en gardant `device_id` du dernier appareil actif pour les rappels
  (préférence « Me rappeler sur cet appareil »).
- **Amendement du 06/09/2026 (ADR-009)** : pas de clé APNs (aucun compte Apple). Android :
  projet Firebase gratuit (`google-services.json` injecté par secret Actions), envoi **FCM
  HTTP v1 directement depuis la fonction Edge** avec la clé de compte de service en secret
  Supabase, priorité haute ; Expo Push Service reste une option équivalente (T4, T12).
  iPhone : Web Push VAPID vers la PWA depuis la même fonction Edge, jamais de push silencieux ;
  les rappels iOS partent du serveur (`pg_cron`) puisqu'une PWA ne planifie rien localement.
