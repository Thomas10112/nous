# 02 — Architecture cible

> Statut : **proposition à valider** (Phase 2), **version 2** après relecture. Suppose la
> stack retenue en [01 — Stack](01-stack.md) : React Native + Expo + TypeScript, Supabase.

## 1. Couches, du haut vers le bas

```
┌─────────────────────────────────────────────────────────────────────────┐
│ apps/mobile                                                             │
│  ├─ app/            Expo Router : écrans = fichiers, navigation native   │
│  ├─ src/features/*  un dossier par domaine : home, calendar, events,    │
│  │                  proposals, moments, countdowns, memories, habits,   │
│  │                  messages, presence, search, stats, settings, trash, │
│  │                  onboarding, auth                                    │
│  │     ├─ screens/  composition d'écran (peu de logique)                │
│  │     ├─ ui/       composants propres au domaine                       │
│  │     ├─ gestures/ worklets et gestes (calendar seulement)             │
│  │     └─ hooks/    useX = TanStack Query + services de domaine         │
│  ├─ src/ui/         design system mobile (05) — dont ui/motion/*        │
│  ├─ src/providers/  Theme, Motion, Session, Data, Sync, Presence,       │
│  │                  Notifications                                       │
│  └─ src/native/     WidgetBridge, App Group, snapshot                   │
├─────────────────────────────────────────────────────────────────────────┤
│ packages/domain      TS pur. Entités + zod, ids dérivés, dates,         │
│                      récurrence, moteur calendrier, agenda, propositions,│
│                      habitudes, comptes à rebours, recherche/périodes,  │
│                      statistiques, planificateur de notifications,      │
│                      interfaces de repositories, services.              │
├─────────────────────────────────────────────────────────────────────────┤
│ packages/data        Repositories SQLite (Drizzle), outbox, SyncEngine, │
│                      registre de sync, RealtimeClient, MediaPipeline,   │
│                      AuthClient (+ LargeSecureStore), PresenceClient,   │
│                      PushRegistrar, client Supabase. Seule couche qui   │
│                      connaît Supabase et expo-sqlite.                   │
├─────────────────────────────────────────────────────────────────────────┤
│ packages/theme · packages/icons                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ supabase/            migrations (tables, sync_guard, gardes, broadcast, │
│                      RLS, purge_trash), functions (push, purge-trash),  │
│                      tests pgTAP, scripts (migrate-v1), seed            │
└─────────────────────────────────────────────────────────────────────────┘
```

Règle de dépendance : une couche n'importe que celles **en dessous**. `domain` n'importe
rien d'autre que `zod` et `date-fns`. Un test ESLint (`import/no-restricted-paths`)
l'impose.

## 2. Responsabilités

### UI (`features/*/screens`, `features/*/ui`, `src/ui`)

Affiche, capte les gestes, appelle un hook. **Aucune règle métier**. Taille cible
< 200 lignes. Toute animation passe par `useMotion()` (règle ESLint : `withSpring`,
`withTiming`, `withRepeat`, `withSequence`, `withDelay` de Reanimated ne s'importent que
dans `src/ui/motion/*`).

### Navigation (`app/`)

Expo Router. **Carte de navigation au pouce** :

```
app/
  (auth)/login
  (onboarding)/…
  (tabs)/_layout            Accueil · Calendrier · [+] · Souvenirs · Messages
    index                   Accueil : héros → proposition en attente → aujourd'hui →
                            prochaine date → présence + message rapide (tiers bas)
    calendar/index          UN seul écran ; la vue (jour/semaine/mois/année) et la date
                            ancrée vivent dans le store Zustand ; ViewSwitch = pilule
                            flottante en bas, « Aujourd'hui » à sa droite si besoin ;
                            chips Habitudes / Propositions ; aucun push dans l'onglet
    calendar/[view]         alias de lien profond : écrit le store et redirige
    memories/index          Constellation des moments + souvenirs + galerie
    memories/[memoryId], memories/moments/[momentId]/[year]   (pile native, swipe-back)
    messages/index
  sheets/                   routes modales présentées en Sheet : event, activity,
                            memory, habit, moment, countdown, proposal, create ("+")
  settings/…                Réglages, Affichage, Notifications, Présence, Corbeille,
                            Statistiques, Synchronisation, Données — accessibles par
                            l'avatar/présence en haut à droite de chaque onglet
  dev/ui, dev/data          builds de développement seulement
```

Le « + » central (cercle accent 56 px, héritier de `.fab`) ouvre `sheets/create` à
40 % : Événement · Activité à deux · Souvenir · Habitude · Moment important, pré-rempli
par le contexte (date ancrée, créneau sélectionné, événement ouvert) ; long-press sur
« + » = Activité à deux directement. Liens profonds `nous://…` pour notifications et
widgets.

### Design system (`src/ui`, `packages/theme`, `packages/icons`)

Voir 05. `ThemeProvider` (palette, schéma, densité), `MotionProvider` (`useMotion()`),
composants de base, maquettes vivantes de `/dev/ui`.

### État local (`features/*/hooks`)

- **TanStack Query** pour tout ce qui vient des repositories ; invalidation par table
  via `DataEvents`. Pas de store global tenant la base en mémoire.
- **Zustand** pour l'état d'interface (vue et date ancrée du calendrier, sélection,
  brouillon de sheet, filtres de recherche, présence reçue).
- **`expo-sqlite/kv-store`** (`kv`) pour les préférences par appareil (`DisplayPreferences`,
  `slotZoom`, pins widget, `device_id`, `serverOffset`) — pas de MMKV.

### État serveur (`packages/data/sync`)

Le SyncEngine ([04](04-sync-offline.md)). L'UI observe `useSyncStatus()` (en ligne, N en
attente, dernier sync, horloge décalée, entrées en échec).

### Domaine (`packages/domain`)

```
domain/
  entities/        Couple, CoupleMember, Profile, ProfilePresence, DisplayPreferences,
                   Event (PersonalEvent | CoupleActivity), Proposal, ImportantMoment,
                   MomentOccurrence, Chapter, Countdown, Memory, Media, Habit,
                   HabitOccurrence, Message, Reaction, ConversationRead, Notification,
                   NotificationPreferences, PushToken, ChangeLogEntry, Location
                   (types + zod + invariants identiques aux CHECK Postgres)
  ids/             uuidV5(ns, key) : occurrenceId, autoChapterId, habitOccurrenceId,
                   proposalId, reactionId, readId, prefsId
  dates/           LocalDate, formats FR, semaines (lundi), « il y a X », dodos, DST
  recurrence/      RecurrenceRule, occurrencesBetween, nextOccurrence, describe, toRRule
  moments/         occurrenceDate (29/02), defaultChapters (bornes Q4)
  calendar/        windowOf, itemsForRange, agendaFor, layoutDay, layoutBands, snap/move/
                   resize/clamp, conflicts, monthGrid, yearOverview, navigation
  proposals/       machine (table de transitions 03 §6), diff de contre-proposition
  habits/          statut d'occurrence, relance, rattrapage (done absorbant)
  countdowns/      cible effective, « Encore N dodos », rappels, widgetEntries(…, pins)
  search/          parseur de périodes FR, requête normalisée, facettes (personne, type)
  stats/           agrégats (catégorie, ville, mois)
  notifications/   planificateur local (horizon 14 j, plafond 60, appareil élu)
  a11y/            describeItem(item) → accessibilityLabel
  repositories/    interfaces (§2.1) + types de requêtes
  services/        cas d'usage : proposeActivity, respondToProposal, moveEvent,
                   attachEventToOccurrence, ensureOccurrence, createMemoryFrom…,
                   markHabitDone, catchUp… (n'écrivent JAMAIS `notifications`)
```

### 2.1 Interfaces de repositories (signatures)

```ts
interface SyncedRepository<T extends SyncedRow> {
  getById(id: string): Promise<T | null>
  list(q: Query<T>): Promise<T[]>
  /** Insère : pose id (v4 ou v5 fourni), created_at/updated_at (horloge corrigée),
   *  updated_from = device ; enfile l'outbox dans la même transaction. */
  create(input: NewRow<T>): Promise<T>
  /** Applique le patch, pose updated_at/updated_from, enfile l'outbox (nouveau seq). */
  patch(id: string, p: Partial<T>): Promise<T>
  /** Corbeille avec cascade explicite (deleted_via) ; restore inverse la cascade. */
  softDelete(id: string): Promise<void>
  restore(id: string): Promise<void>
  listTrash(): Promise<T[]>
  /** Écriture venant du serveur (pull, broadcast, réponse de push) : applique la règle
   *  LWW de 04 §7 ; n'enfile RIEN dans l'outbox. */
  applyRemote(rows: T[]): Promise<ApplyResult>
}

interface Outbox {
  enqueue(tx: Tx, table: string, rowId: string, payload: unknown): void   // delete + insert (nouveau seq)
  take(table: string, limit: number): Promise<OutboxEntry[]>
  ack(rowId: string, seq: number): Promise<void>
  fail(seq: number, error: string, retryable: boolean): Promise<void>
  pendingCount(): Promise<number>
  isDirty(table: string, rowId: string): Promise<boolean>
}

interface DataEvents { emit(table: string): void; on(table: string, fn: () => void): () => void }
interface KeyValueStore { get<T>(k: string): T | undefined; set<T>(k: string, v: T): void; delete(k: string): void }
interface LocalMediaStore {
  importFile(uri: string, id: string): Promise<{ uri: string; bytes: number }>
  makeThumbnail(id: string): Promise<string>
  uriFor(id: string): string | null
  remove(id: string): Promise<void>
}
/** Une ligne par table synchronisée ([03 §3](03-modele-de-donnees.md)). */
interface SyncRegistryEntry {
  table: string; mode: 'lww' | 'pull-only' | 'rpc' | 'legacy'
  scope: 'couple' | 'user'; pushOrder: number; schema: ZodType
  topic?: (row: SyncedRow) => string
}
```

Une implémentation **en mémoire** de chaque interface sert aux tests de domaine et aux
maquettes.

### Repositories (`packages/data/repositories`)

Implémentation SQLite générique `SqliteSyncedRepository<T>` paramétrée par l'entrée de
registre ; les repositories concrets n'ajoutent que leurs requêtes (`inRange`,
`forOccurrence`, `unreadCount`…). Une base **par compte** (`nous-{uid}.db`).

### Synchronisation / hors ligne / médias (`packages/data/{sync,realtime,media}`)

Voir 04.

### Notifications (`packages/data/push`, `domain/notifications`)

Voir ADR-007. `LocalScheduler` (Phase 10) applique le plan calculé par le domaine ;
`PushRegistrar` enregistre le jeton par RPC ; les triggers serveur (Phase 15) insèrent
dans `notifications` ; l'Edge Function `push` envoie.

### Temps réel et présence (`packages/data/realtime`, `features/presence`)

`RealtimeClient` : canal privé, `setAuth`, rejoin, route `broadcast` → SyncEngine
(indice + application optimiste), `presence` → `PresenceStore`.

### Authentification (`packages/data/auth`)

Supabase Auth (surnom → e-mail technique, inchangé). Session persistée par
**`LargeSecureStore`** : clé AES-256 dans `expo-secure-store` (limite 2 Ko par valeur),
session chiffrée dans `expo-sqlite/kv-store` ; `AppState` → `auth.startAutoRefresh()` /
`stopAutoRefresh()`. Configuration par profil EAS : `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY` lus dans `app.config.ts`. Portes d'entrée : session →
ouverture de la base du compte → onboarding si aucun siège → app.

## 3. Ce qui reste découplé (et comment on le garantit)

| Couplage à éviter                          | Garde-fou                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| UI ↔ SQL / Supabase                        | ESLint interdit `@nous/data/*` internes et `@supabase/*` hors `packages/data`. |
| UI ↔ animations ad hoc                     | ESLint : primitives Reanimated seulement dans `src/ui/motion/*`.           |
| Domaine ↔ plateforme                       | `packages/domain` n'a que `zod` et `date-fns`. Les fonctions de snap sont dupliquées en worklets avec un test d'égalité (06 §3.3). |
| Calendrier ↔ type d'item                   | `CalendarItem` est une union : un type de plus = un cas dans `windowOf`.   |
| Sync ↔ entité                              | Le SyncEngine est générique sur le squelette + le registre.                |
| Widgets ↔ app                              | Le widget lit un snapshot JSON écrit par `WidgetBridge`.                   |
| Notifications ↔ écrans                     | Les notifications portent un lien profond, jamais un état d'écran.         |
| Présence ↔ messagerie                      | Store à part, la messagerie s'y abonne.                                    |
| Comptes ↔ base locale                      | Un fichier SQLite par compte ; le Pusher vérifie le propriétaire.          |

## 4. Flux types

**Créer une activité à deux (hors ligne).** Sheet → `useCreateActivity()` →
`services.proposeActivity(input)` (domaine : valide, construit `Event(kind=activity)` +
`Proposal(round=1, id=v5)`) → repositories (transaction, outbox) → `DataEvents` → la
grille montre le bloc en pointillés → plus tard, push → `sync_guard` accepte → trigger
dérive `events.status = proposed` → broadcast → le téléphone de l'autre tire la table et
affiche la `ProposalBubble` → trigger (Phase 15) insère une `notification` → Edge
Function → push.

**Déplacer un événement par drag.** Geste (thread UI, worklets) → `snapToSlot` (copie
worklet) → aperçu → relâchement → `useMoveEvent()` → `services.moveEvent(id, window)`
(`setWindow` ; une activité acceptée dont on change date/heure/lieu repasse en
proposition) → repository → sync. Toast « Déplacé au mardi · Annuler ».

**Ouvrir l'app.** `SessionProvider` restaure la session → `DataProvider` ouvre
`nous-{uid}.db` → écrans rendus depuis SQLite → `SyncEngine.start()` (purge locale,
`purge_trash()` + `purge-trash`, push, pull, canal) → présence publiée → plan de
notifications locales recalculé.

## 5. Qualité, tests, CI

- TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` dans
  `tsconfig.base.json` ; **`apps/web/tsconfig.json` désactive ces deux dernières options**
  (site gelé, ADR-002) — sinon `Settings.tsx:357` ne compile plus.
- ESLint + Prettier ; `import/no-restricted-paths` ; règle motion.
- Vitest : `domain` (unitaires + propriétés), `data` (repositories sur better-sqlite3,
  SyncEngine sur `FakeServer`), `theme` (paires de contraste autorisées).
- Supabase local (CLI + Docker) : pgTAP (`supabase test db`), tests Realtime.
- Maestro : parcours sur builds de développement ; protocole deux téléphones (04 §12).
- GitHub Actions : typecheck, lint, tests, `supabase test db`, build web, `expo doctor`,
  `keep-alive` (6 h).
- EAS : profils `development`, `preview` (distribution interne, URL Supabase via proxy
  pour le chaos), `production`.
