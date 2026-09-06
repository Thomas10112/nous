# 02 — Architecture cible

> Statut : **proposition à valider** (Phase 2). Suppose la stack retenue en
> [01 — Stack](01-stack.md) : React Native + Expo + TypeScript, Supabase.

## 1. Couches, du haut vers le bas

```
┌─────────────────────────────────────────────────────────────────────────┐
│ apps/mobile                                                             │
│  ├─ app/            Expo Router : écrans = fichiers, navigation native   │
│  ├─ features/*      un dossier par domaine : calendar, proposals,       │
│  │                  moments, memories, habits, messages, presence,      │
│  │                  search, stats, settings, trash                      │
│  │     ├─ screens/  composition d'écran (peu de logique)                │
│  │     ├─ ui/       composants propres au domaine                       │
│  │     └─ hooks/    useX = TanStack Query + services de domaine         │
│  ├─ ui/             design system mobile (05)                           │
│  ├─ providers/      Theme, Motion, Session, Sync, Presence, Notifications│
│  └─ native/         modules Expo (widgets, App Group, snapshot)         │
├─────────────────────────────────────────────────────────────────────────┤
│ packages/domain      TS pur. Entités, invariants, moteurs (récurrence,  │
│                      calendrier, recherche/périodes, notifications      │
│                      planifiées), interfaces de repositories.           │
├─────────────────────────────────────────────────────────────────────────┤
│ packages/data        Repositories SQLite (Drizzle), SyncEngine, outbox,  │
│                      MediaPipeline, RealtimeClient, AuthClient,         │
│                      PresenceClient, PushRegistrar. Seule couche qui     │
│                      connaît Supabase et expo-sqlite.                   │
├─────────────────────────────────────────────────────────────────────────┤
│ packages/theme · packages/icons                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ supabase/            migrations SQL (tables, triggers LWW, broadcast,   │
│                      RLS, pg_cron), Edge Functions (push, purge-trash), │
│                      scripts (import v1)                                │
└─────────────────────────────────────────────────────────────────────────┘
```

Règle de dépendance : une couche n'importe que celles **en dessous**. `domain` n'importe
rien d'autre que ses propres modules (ni React, ni Supabase, ni Expo). Un test ESLint
(`import/no-restricted-paths`) l'impose.

## 2. Responsabilités

### UI (`apps/mobile/features/*/screens`, `ui/`)

Affiche, capte les gestes, appelle un hook. **Aucune règle métier** : un composant ne
calcule pas une occurrence, ne décide pas qu'une proposition est acceptée, ne compose pas
une requête SQL. Taille cible < 200 lignes ; un écran est une composition de composants.

### Navigation (`apps/mobile/app`)

Expo Router (pile native + onglets). Arbre :

```
app/
  (auth)/login
  (onboarding)/…
  (tabs)/
    index            Accueil (aujourd'hui, présence, prochaine date, message rapide)
    calendar/        [view]=day|week|month|year, event/[id], new
    memories/        galerie + souvenirs + constellation des moments
    messages/
    more/            habitudes, propositions, statistiques, corbeille, réglages, sections v1
  sheets/            routes modales (édition, proposition, souvenir) présentées en sheet
```

Deep links `nous://…` pour les notifications et les widgets.

### Design system (`apps/mobile/ui`, `packages/theme`, `packages/icons`)

Voir 05. Fournit `ThemeProvider` (palette, schéma, densité), `MotionProvider`
(`useMotion()`), composants de base.

### État local (`apps/mobile/features/*/hooks`)

- **TanStack Query** pour tout ce qui vient des repositories : `useQuery({ queryKey:
  ['events', range], queryFn: () => repos.events.inRange(range) })`. Invalidation par
  **table** via `DataEvents` (bus émis par les repositories et le SyncEngine). Pas de
  store global en mémoire tenant toute la base (fin du `store.tsx` v1).
- **Zustand** pour l'état d'interface éphémère seulement (vue courante, date ancrée,
  brouillon de sheet, filtre de recherche).
- **MMKV** (`kv`) pour les préférences par appareil.

### État serveur (`packages/data/sync`)

Le SyncEngine (04) : outbox → push, pull par curseur, Realtime → application locale.
L'UI ne l'appelle jamais directement ; elle observe `useSyncStatus()` (en ligne, N en
attente, dernier sync).

### Domaine (`packages/domain`)

```
domain/
  entities/        Event, Proposal, ImportantMoment, MomentOccurrence, Chapter, Memory,
                   Media, Habit, HabitOccurrence, Countdown, Message, Reaction,
                   Notification, Profile, Couple, ChangeLogEntry  (types + zod schemas)
  dates/           LocalDate, formats FR, semaines, « il y a X », dodos
  recurrence/      RecurrenceRule, occurrencesBetween, nextOccurrence, occurrenceDate (moments)
  calendar/        itemsForRange, layoutDay, layoutWeekBands, snap/move/resize, conflicts, grids
  proposals/       machine d'états (propose / accept / decline / counter / withdraw)
  habits/          statut d'une occurrence, « Alors, vous l'avez fait ? », rattrapage
  countdowns/      cible effective, « Encore N dodos », rappels J-7/J-1
  search/          parseur de périodes naturelles FR, requête normalisée
  stats/           agrégats (par catégorie, ville, mois)
  notifications/   planificateur local (quoi, quand, sur quel appareil)
  repositories/    interfaces (EventRepository, …) + types de requêtes
  services/        cas d'usage qui orchestrent plusieurs repositories (créer une activité =
                   event + proposal + notification)
```

Tout est testé en Vitest. C'est le cœur : si demain l'UI change (web, widget), rien ici
ne bouge.

### Repositories (`packages/data/repositories`)

Une implémentation SQLite par interface, générique sur le squelette commun (`SyncedTable`)
pour ne pas dupliquer `getById / upsert / softDelete / restore / changesSince`. Chaque
écriture = ligne + outbox dans une transaction + `DataEvents.emit(table)`.

Une implémentation **en mémoire** de chaque interface sert aux tests de domaine et aux
aperçus de composants.

### Synchronisation / hors ligne (`packages/data/sync`, `packages/data/media`)

Voir 04.

### Notifications (`packages/data/push`, `domain/notifications`)

Voir ADR-007. `PushRegistrar` enregistre le jeton ; `LocalScheduler` applique le plan
calculé par le domaine avec `expo-notifications` ; les Edge Functions envoient le reste.

### Temps réel et présence (`packages/data/realtime`)

`RealtimeClient` ouvre le canal `couple:{id}` et route : `broadcast` → SyncEngine,
`presence` → `PresenceStore` (Zustand), dérive les bulles d'activité éphémères.

### Authentification (`packages/data/auth`)

Supabase Auth (surnom → e-mail technique, inchangé), session persistée dans
`expo-secure-store`, `SessionProvider` qui expose `profile`, `couple`, `partner`. Portes
d'entrée dans l'ordre : session → cache local lu **avant** le réseau → onboarding si le
couple n'est pas configuré → app.

## 3. Ce qui reste découplé (et comment on le garantit)

| Couplage à éviter                          | Garde-fou                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| UI ↔ SQL / Supabase                        | ESLint interdit `@nous/data/*` internes et `@supabase/*` hors `packages/data`. |
| Domaine ↔ plateforme                       | `packages/domain` n'a que `zod` et `date-fns` en dépendances.              |
| Calendrier ↔ type d'item                   | `CalendarItem` est une union : ajouter un type = un cas de plus dans `windowOf`, rien dans la grille. |
| Sync ↔ entité                              | Le SyncEngine est générique sur `SyncedTable` ; ajouter une table = une ligne dans un registre. |
| Widgets ↔ app                              | Le widget lit un **snapshot** JSON écrit par `WidgetBridge` ; il ne connaît ni SQLite ni Supabase. |
| Notifications ↔ écrans                     | Les notifications portent un deep link, jamais un état d'écran.            |
| Présence ↔ messagerie                      | La présence est un store à part, la messagerie s'y abonne.                 |

## 4. Flux types

**Créer une activité à deux (hors ligne).** Sheet → `useCreateActivity()` →
`services.proposeActivity(input)` (domaine : valide, construit `Event(status=proposed)` +
`Proposal(round=1)`) → `repos.events.upsert` + `repos.proposals.upsert` (transaction,
outbox) → `DataEvents` → la grille se met à jour → plus tard, `SyncEngine` pousse → le
trigger serveur broadcast → le téléphone de l'autre applique → sa `ProposalBubble`
apparaît ; une ligne `notifications` est insérée par trigger → Edge Function → push.

**Déplacer un événement par drag.** Gesture (UI thread) → `snapToSlot` → aperçu →
relâchement → `useMoveEvent()` → `services.moveEvent(id, window)` (vérifie les règles :
une activité acceptée dont on change l'heure repasse en proposition) → repository → sync.

**Ouvrir l'app.** `SessionProvider` lit la session → `SyncEngine.start()` (pull
incrémental en arrière-plan) → écrans rendus depuis SQLite immédiatement → Realtime
connecté → présence publiée.

## 5. Qualité, tests, CI

- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- ESLint + Prettier ; `import/no-restricted-paths` pour les couches.
- Vitest : `domain` (unitaires + propriétés), `data` (repositories sur better-sqlite3,
  SyncEngine sur faux serveur), `theme` (contrastes).
- Maestro : parcours critiques sur build de développement (créer une activité, accepter,
  drag, hors ligne → en ligne).
- GitHub Actions : typecheck, lint, tests, build web (non-régression), `expo doctor`.
- EAS : profils `development`, `preview` (distribution interne), `production`.
