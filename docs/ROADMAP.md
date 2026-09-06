# Nous — Roadmap technique du calendrier mobile

> **Statut : proposition, en attente de validation — version 2** après relecture
> contradictoire (sept lentilles, réfutations, synthèse). Aucune ligne de code applicatif
> n'est écrite tant que les Phases 0 à 3 ne sont pas validées. Ce document est le
> contrat : un autre développeur doit pouvoir reprendre le projet à n'importe quelle
> phase avec lui seul.
>
> Documents liés : [00 Audit](00-audit.md) · [01 Stack](01-stack.md) ·
> [02 Architecture](02-architecture.md) · [03 Modèle de données](03-modele-de-donnees.md) ·
> [04 Sync & hors ligne](04-sync-offline.md) · [05 Design system](05-design-system-mobile.md) ·
> [06 Moteur calendrier](06-moteur-calendrier.md) · [07 Questions ouvertes](07-questions-ouvertes.md) ·
> [ADR](adr/)

## 0. Lecture rapide

Le tableau donne les **dépendances directes** ; le graphe en est dérivé (en cas d'écart,
le tableau fait foi). **Ordre linéaire recommandé** pour un développeur seul :
2 · 3 · 6 · 4 · 5 · 7 · 8 · 9 · 10 · 12 · 11 · 13 · 14 · 15 · 16 · 17 · 18 · 19.

| Phase | Titre                                  | Dépend de   | Livrable vérifiable                                                                     |
| ----- | -------------------------------------- | ----------- | --------------------------------------------------------------------------------------- |
| 0     | Audit                                  | —           | `docs/00-audit.md` ✅                                                                    |
| 1     | Stack mobile et spike                  | 0           | `docs/01-stack.md`, ADR-001, **spike de la vue Semaine sur les deux téléphones**, compte Apple, mesures — **validation attendue** |
| 2     | Architecture & monorepo                | 1           | Monorepo pnpm, app Expo connectée à Supabase sur les deux téléphones, web non régressé, CI, keep-alive |
| 3     | Modèle de données & repositories       | 2           | Migrations sur instance locale puis projet réel, identité du couple installée, moteur de récurrence, repositories testés en Node |
| 4     | Stockage local & hors ligne            | 3           | Base par compte, outbox, curseurs transactionnels, FTS ; CRUD complet en mode avion       |
| 5     | Synchronisation temps réel             | 4           | Registre de modes, push/pull/LWW/canal privé ; convergence 3/3 au protocole deux téléphones |
| 6     | Design system mobile                   | 2           | `packages/theme`, `ui/*`, galerie + **quatre maquettes vivantes validées par le couple**  |
| 7     | Moteur calendrier & Accueil            | 3, 6        | Vues Accueil / Jour / Semaine / Mois / Année, gestes arbitrés, données de démonstration  |
| 8     | Événements personnels                  | 4, 5, 7     | Créer / éditer / déplacer / supprimer / restaurer, hors ligne et sur l'autre téléphone   |
| 9     | Activités à deux & propositions        | 8           | Bulle : accepter / refuser / contre-proposer / retirer ; gardes serveur                   |
| 10    | Moments importants, chapitres, comptes à rebours, rappels locaux | 8 | Constellation, occurrences, chapitres, « Encore 24 dodos », planificateur local |
| 11    | Souvenirs & médias                     | 8           | Photos / vidéos hors ligne (TUS), galerie unifiée v1 + nouveaux, purge Storage           |
| 12    | Habitudes                              | 8           | « Tous les [3] [semaines] », fait / pas fait / rattraper, relance                        |
| 13    | Recherche & statistiques               | 10, 11      | Périodes naturelles, personnes, contenu associé ; « Nos statistiques » masquable         |
| 14    | Messagerie & présence                  | 5, 6, 8     | Conversation, réactions hors ligne, présence partout, bulles d'activité, message rapide  |
| 15    | Notifications push                     | 9, 12, 14   | Triggers → Edge Function → Expo Push ; préférences ; liens profonds                       |
| 16    | Widgets iOS / Android                  | 10, 11      | Widget photo + compte à rebours, 3 tailles, juste à minuit sans ouvrir l'app             |
| 17    | Polish UX, réglages, onboarding        | 9, 12, 13, 14, 15, 16 | Réglages complets (affichage, présence, notifications…), reduced-motion, a11y |
| 18    | Tests complets                         | 17          | E2E, chaos par proxy, charge, VoiceOver / TalkBack, couverture                           |
| 19    | Optimisation & production              | 18          | Builds EAS, distribution privée, durcissement Supabase, sauvegardes, runbook              |

```mermaid
flowchart LR
  P0[0 Audit] --> P1[1 Stack + spike] --> P2[2 Archi]
  P2 --> P3[3 Données] --> P4[4 Hors ligne] --> P5[5 Sync]
  P2 --> P6[6 Design system]
  P3 --> P7[7 Moteur + Accueil]
  P6 --> P7
  P4 --> P8[8 Événements]
  P5 --> P8
  P7 --> P8
  P8 --> P9[9 Activités]
  P8 --> P10[10 Moments + rappels]
  P8 --> P11[11 Souvenirs]
  P8 --> P12[12 Habitudes]
  P10 --> P13[13 Recherche & stats]
  P11 --> P13
  P5 --> P14[14 Messagerie & présence]
  P6 --> P14
  P8 --> P14
  P9 --> P15[15 Push]
  P12 --> P15
  P14 --> P15
  P10 --> P16[16 Widgets]
  P11 --> P16
  P9 --> P17[17 Polish]
  P12 --> P17
  P13 --> P17
  P14 --> P17
  P15 --> P17
  P16 --> P17
  P17 --> P18[18 Tests] --> P19[19 Prod]
```

## 1. Règles de conduite (valables pour toutes les phases)

1. **À chaque phase** : expliquer ce qui va être fait → lister les fichiers → implémenter →
   tester → corriger → vérifier l'architecture (règle de dépendance des couches, taille
   des fichiers, absence de logique métier dans l'UI) → seulement ensuite passer à la
   suivante. Une phase se termine par une PR nommée `phase-N-…` avec sa *définition de
   fini* cochée — **chaque phase en a une, mesurable**.
2. **Définition de fini commune** : typecheck, lint, tests verts ; `apps/web` se construit
   encore ; `expo doctor` vert ; aucun `any` ; aucun `TODO` sans ticket ; composants
   < 200 lignes sauf justification ; décision non évidente → ADR ou commentaire « pourquoi ».
3. **Rien n'est supprimé du web** avant que le mobile ne soit en production.
4. **La logique métier vit dans `packages/domain`**, testée en Node.
5. **Migrations serveur additives** jusqu'à la Phase 19 ; le contrat `items(collection,
   data)` lu par le web n'est jamais altéré.
6. **Deux téléphones réels** (un iPhone, un Android — modèles fixés en Phase 1, T10) :
   la Phase 4 est vérifiée en mode avion ; chaque phase ≥ 5 est vérifiée sur les deux
   téléphones, en mode avion puis en ligne, au **protocole deux téléphones** de la Phase 5 —
   **Android automatisé (Maestro), iPhone par check-list manuelle** (`maestro/MANUAL-IOS.md`)
   tant qu'il n'y a pas de Mac : Maestro ne pilote pas d'iPhone physique.
7. **Budget de builds** : le plan EAS gratuit donne 15 builds iOS et 15 Android par mois.
   Un build de développement n'est refait que lorsqu'une dépendance native change ; le
   JavaScript passe par le serveur de développement ou EAS Update.
8. **L'usage réel par le couple** (« une semaine sans perte ») est un *soak* en parallèle,
   jamais le critère bloquant : le critère est le scénario automatisé (ou la check-list
   iOS jouée et signée).

## 2. Structure cible du dépôt

```
nous/
├─ apps/
│  ├─ web/                        site v1 (déplacé tel quel, gelé — ADR-002)
│  └─ mobile/
│     ├─ app/                     routes Expo Router (carte en 02 §2)
│     ├─ src/
│     │  ├─ ui/                   design system mobile (05), dont ui/motion/*
│     │  ├─ providers/            Theme, Motion, Session, Data, Sync, Presence, Notifications
│     │  ├─ features/
│     │  │  ├─ home/  calendar/ (+ gestures/)  events/  proposals/  moments/  countdowns/
│     │  │  ├─ memories/  habits/  messages/  presence/  search/  stats/
│     │  │  └─ settings/  trash/  onboarding/  auth/
│     │  └─ native/               WidgetBridge, App Group, snapshot
│     ├─ widgets/                 ios/ (expo-widgets ou targets Swift)  android/
│     ├─ assets/                  polices, tuile de grain, icône, splash
│     ├─ maestro/  scripts/two-phones.sh
│     ├─ app.config.ts  eas.json
├─ packages/
│  ├─ domain/                     entités, ids, moteurs, interfaces, services (TS pur)
│  ├─ data/                       SQLite, outbox, sync (registry), realtime, médias, auth, presence, push
│  ├─ theme/                      tokens.ts → tokens.css + createTheme + contrastes
│  └─ icons/
├─ supabase/
│  ├─ migrations/  functions/{push,purge-trash}/  tests/ (pgTAP)  scripts/migrate-v1.ts  seed/
├─ docs/
├─ .github/workflows/ci.yml  keep-alive.yml  backup.yml
├─ pnpm-workspace.yaml  package.json  tsconfig.base.json  .eslintrc.cjs  .prettierrc
```

## 3. Les phases

---

### Phase 0 — Audit ✅

Fait : [00-audit.md](00-audit.md). Dix-neuf dettes avec preuves, contre-lues ; inventaire
du réutilisable.

---

### Phase 1 — Choix de la stack, spike, prérequis

**Objectif.** Trancher, justifier, **prouver sur les téléphones du couple** que le point le
plus risqué de la stack tient, et lever les prérequis. **Point de validation.**

**Livrables.**

- [01-stack.md](01-stack.md) (comparatif, contre-expertise, verdict), [ADR-001](adr/ADR-001-stack-react-native-expo.md).
  Réponses aux questions T1–T11 de [07](07-questions-ouvertes.md).
- **Prérequis** : compte Apple Developer actif (indispensable pour un build de
  développement sur iPhone, donc dès la Phase 2), iPhone et Android de test enregistrés
  (modèles, OS, 60/120 Hz notés), profil EAS `development` fonctionnel, projet Supabase
  réactivé.
- **Mesures sur les données réelles** : `items` par collection (nombre, taille),
  objets Storage et orphelins (`storage.objects` vs références `cloud:` dans les dix
  champs de `items.data`), `local:` restants, échelle réelle de `Adventure.rating`,
  réglage « Max rows » de l'API (≥ 1000), mode réellement utilisé par le couple
  (`VITE_SUPABASE_*` du déploiement). Ces chiffres dimensionnent la migration et le plan
  Supabase (T9).
- **Spike de deux semaines — la porte de décision** ([01 §6](01-stack.md)) : projet Expo
  jetable (SDK courant épinglé), vue Semaine 48 créneaux × 7 jours : long-press 350 ms →
  soulèvement haptique → drag sur worklet → accrochage 30 min → poignées → pinch de
  hauteur de créneau, scroll qui ne se bat pas avec le drag, colonne focus en portrait
  ([06 §3.7, §4](06-moteur-calendrier.md)) ; plus un écran de messagerie factice pour le
  clavier. Build de développement sur les deux téléphones. **Critères** : 0 frame
  > 16 ms pendant le drag sur l'Android du couple (`useFrameCallback`), 0 geste perdu sur
  50 essais, clavier sans saut, et le verdict du couple : « ça sent l'app » ou « ça sent
  le site ». Le code est jeté ; on garde la décision et les réglages de gestes.

**Fini quand** : stack validée par écrit après le spike ; compte Apple, appareils et profil
EAS opérationnels ; projet Supabase joignable ; les deux `auth.uid()` connus ; volumes mesurés.

**Effort.** 10–12 jours (dont le spike).

---

### Phase 2 — Architecture générale et monorepo

**Objectif.** Poser la coquille sans fonctionnalité, en prouvant que le web ne régresse
pas, et que l'app se connecte à Supabase sur les deux téléphones.

**Fichiers.**

- `pnpm-workspace.yaml`, `package.json` racine, `tsconfig.base.json` (strict +
  `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`), **`apps/web/tsconfig.json`
  étend la base mais désactive ces deux options** (site gelé — sinon `Settings.tsx:357`
  ne compile plus), `.eslintrc.cjs` (typescript-eslint, react-hooks,
  `import/no-restricted-paths`, règle motion), `.prettierrc`,
  `.github/workflows/{ci,keep-alive}.yml`.
- `apps/web/**` ← `git mv` ; `supabase/legacy/{schema,auth}.sql`.
- `apps/mobile/` ← `create-expo-app` avec **`expo@^57.0.17`** (RN ≥ 0.86.3 : les versions
  antérieures, SDK 56 compris, portent une régression mémoire Hermes V1 sur les worklets
  — le cœur du calendrier), Expo Router, TypeScript ; `app.config.ts` (scheme `nous`,
  bundle ids, plugins, lecture de `EXPO_PUBLIC_SUPABASE_URL` /
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` par profil), `eas.json` (`development` / `preview` /
  `production`) ; `.npmrc` racine `node-linker=hoisted` ; `pnpm.overrides` garantissant
  une seule copie de `react`, `react-native`, `react-native-reanimated`,
  `react-native-worklets`, `react-native-nitro-modules` ; assertion de version en CI.
- `packages/domain/src/{dates,utils}/` ← extraction et **correction** de `lib/date.ts`
  (D7, D8) et `lib/utils.ts`, tests de caractérisation avant, tests après.
- `packages/data/src/supabase/client.ts` (client RN : storage de session injecté,
  `AppState` → `auth.startAutoRefresh()` / `stopAutoRefresh()` comme l'exige la doc
  Supabase pour React Native), `packages/data/src/auth/{nickname.ts,session.ts,AuthClient.ts,LargeSecureStore.ts}`
  (clé AES-256 générée par `expo-crypto` et gardée dans `expo-secure-store`, session
  chiffrée stockée dans `expo-sqlite/kv-store` — SecureStore plafonne à 2 Ko par valeur).
- `packages/theme/src/tokens.ts` + `scripts/generate-css.ts` + **test de parité** (parse
  postcss de l'ancien et du nouveau `tokens.css`, égalité des propriétés par palette ×
  schéma ; `--sidebar-w`/`--header-h` dans `apps/web/src/styles/layout-tokens.css`).
- `packages/icons/src/{paths.ts,index.ts}` ← `Icon.tsx:15-70`.
- `apps/web` importe `@nous/domain`, `@nous/theme`, `@nous/icons` ; contrôle visuel des
  **14 écrans** : `/`, `/aventures`, `/mots`, `/logements`, `/carte`, `/bucket-list`,
  `/galerie`, `/awards`, `/capsules`, `/moodboard`, `/reglages`, Login, Onboarding, Proposal.
- `apps/mobile/src/providers/{ThemeProvider,MotionProvider,SessionProvider}.tsx`,
  `app/_layout.tsx`, `app/(auth)/login.tsx`, `app/(tabs)/_layout.tsx` (Accueil ·
  Calendrier · [+] · Souvenirs · Messages, vides). Polices Fraunces (400/500/600 +
  italiques) et Inter embarquées ; tuile de grain.

**Tests.** `packages/domain/dates` (≥ 40 cas, DST 2026-03-29 / 2026-10-25, 29/02) ; parité
`tokens.css` ; `pnpm web:build` ; `expo doctor` ; **une session de 6 Ko persiste et
survit à un redémarrage à froid** sur iOS et Android ; connexion réussie sur les deux
téléphones avec thème et polices.

`keep-alive.yml` : `GET /rest/v1/items?select=id&limit=1` avec la clé publique toutes
les 6 h — une requête qui **touche une table** (un ping de santé ne compte pas comme
activité) — et une alerte si le workflow échoue.

**Fini quand** : CI verte, web identique, app connectée, `keep-alive` actif.

**Effort.** 5–7 jours.

---

### Phase 3 — Modèle de données et repositories

**Objectif.** Faire exister [03](03-modele-de-donnees.md) aux trois endroits (domaine,
SQLite, Postgres), l'**identité du couple installée en production**, sans UI.

**Fichiers.**

- `packages/domain/src/entities/*.ts` (17 entités + `DisplayPreferences`, `Location`,
  zod, invariants = CHECK), `ids/` (UUID v5 : `occurrenceId`, `autoChapterId`,
  `habitOccurrenceId`, `proposalId`, `reactionId`, `readId`, `prefsId`),
  **`recurrence/{rule,iterate}.ts`** (tables de vérité + propriétés, ADR-004),
  `moments/{occurrenceDate,defaultChapters}.ts`, `repositories/*.ts` (signatures de
  [02 §2.1](02-architecture.md)), `services/{attachEventToOccurrence,ensureOccurrence}.ts`.
- `packages/data/src/schema/*.ts` (Drizzle + colonnes locales + index de 03 §16),
  `repositories/SqliteSyncedRepository.ts` + repositories concrets, `testing/memory/*`.
- `supabase/migrations/` : `0001_identity.sql` (couples, couple_members, profiles,
  profile_presence, `auth_couple_id()`, `sync_guard()`, policy Storage avec
  `legacy_space`), `0002_calendar.sql` (events + CHECK + dérivation des dates,
  proposals + gardes + dérivation de `events.status`), `0003_moments.sql`,
  `0004_memories_media.sql` (trigger `coalesce(storage_path)`), `0005_habits.sql` (`done`
  absorbant), `0006_messaging.sql` (messages immuables, réactions, lectures),
  `0007_notifications.sql`, `0008_history_trash.sql` (change_log plafonné,
  `purge_trash()`, `storage_purge_queue`, `cron.schedule` quotidien), `0009_sync.sql` (broadcast, policies
  `realtime.messages`), `0010_legacy_items.sql` (policy `space = legacy_space`, index —
  rien d'autre).
- `supabase/tests/*.sql` (pgTAP) ; `supabase/seed/dev.sql` : **deux couples, quatre comptes**.
- `supabase/scripts/migrate-v1.ts` : étapes idempotentes `identity` (couples,
  couple_members, profiles depuis `items(settings)` et `--map p1=<uuid> --map p2=<uuid>`),
  `moments` (Phase 10), `media-legacy` (Phase 11) ; `--dry-run` par défaut, `--apply`.
- `.github/workflows/backup.yml` : `pg_dump` hebdomadaire chiffré vers un dépôt privé.

**Tests.** Domaine : zod, `occurrenceDate` (29/02 deux règles), récurrence (quotidien,
toutes les 3 semaines lundi + mercredi, 15 du mois, dernier jour, 2e lundi, annuel,
`UNTIL`, `COUNT`, 31 → 30 ; propriétés), ids v5 stables, `defaultChapters` aux bornes Q4.
Repositories (Node + better-sqlite3) : CRUD, corbeille avec cascade `deleted_via`,
restauration sélective, rollback. pgTAP (instance locale, `supabase test db`) : un
upsert perdant renvoie zéro ligne, ne diffuse rien, n'écrit pas `change_log` ; couple égal
= no-op ; `updated_at` en avance ramené ; `couple_id`/`created_by` forcés ; RLS croisée
(couple B ne voit rien de A, y compris Storage et `items`) ; tour terminal immuable ;
`done` absorbant ; suppression de message à 4:59 acceptée / 5:01 refusée ; `purge_trash`
enfants avant parents, activité refusée > 30 j en corbeille, résurrection refusée
(`P0030`) ; Storage : photo v1 sous `legacy_space` lisible.

**Fini quand** : migrations appliquées sur l'instance locale puis sur le projet réel
(`supabase db push`, web v1 toujours fonctionnel) ; **étape `identity` appliquée en
vrai** (après sauvegarde JSON) : les deux comptes ont un siège et voient leurs données ;
`pnpm test` couvre les trois couches.

**Effort.** 8–10 jours.

---

### Phase 4 — Stockage local et hors ligne

**Objectif.** L'app lit et écrit uniquement dans SQLite ; tout fonctionne en mode avion.

**Fichiers.**

- `packages/data/src/db/{open.ts (nous-{uid}.db),migrate.ts,events.ts}`,
  `outbox/{Outbox.ts,types.ts}` (delete + insert nouveau `seq`, ack par `(row_id, seq)`),
  `sync/state.ts` (`sync_state` en SQLite), `kv/` (`expo-sqlite/kv-store` : `device_id`,
  préférences, `slotZoom`, pins, `serverOffset` — **pas de curseur**), `search/fts.ts` (colonnes de
  [04 §4.1](04-sync-offline.md)), `media/LocalMediaStore.ts`.
- `apps/mobile/src/providers/{DataProvider,QueryProvider}.tsx`, hooks génériques,
  `app/dev/data.tsx` (compteurs, outbox, export JSON, purge locale).

**Tests.** Chaque écriture = une entrée d'outbox fusionnée par remplacement ; FTS à jour
(y compris renommage d'un parent) ; **kill entre page et curseur** (exception après 300
lignes → curseur inchangé) ; sur téléphone : mode avion, 20 objets créés / modifiés /
supprimés / restaurés, kill, relance → tout est là, outbox = 20 ; changement de compte →
autre fichier.

**Fini quand** : aucune requête réseau nécessaire après la première connexion ; la file
survit au redémarrage ; les deux comptes ne se mélangent pas.

**Effort.** 4–5 jours.

---

### Phase 5 — Synchronisation temps réel

**Objectif.** [04 §6–§11](04-sync-offline.md), avec le **protocole deux téléphones**.

**Fichiers.**

- `packages/data/src/sync/{SyncEngine,Pusher,Puller,applyRemote,registry,backoff,clock}.ts`,
  `realtime/{RealtimeClient,channel}.ts` (privé, `setAuth`, rejoin, indice + pull
  debounced), `supabase/{tables.ts}`, `NetInfo`/`AppState`.
- `packages/data/src/testing/FakeServer.ts` (triggers LWW, broadcast, **commit
  retardé**, **purge**, graine).
- `apps/mobile/src/providers/SyncProvider.tsx`, `features/settings/ui/SyncStatus.tsx`
  (en ligne · N en attente · échecs · horloge décalée).
- `apps/mobile/scripts/two-phones.sh` + flows Maestro témoins ; profil EAS `preview`
  avec URL Supabase derrière **toxiproxy**.

**Tests.** Toute la table de [04 §12](04-sync-offline.md) : matrice LWW avec égalités,
édition pendant push, pagination 800 lignes au même instant, commit tardif, ids dérivés
(même occurrence hors ligne sur deux clients → une ligne, zéro `failed`), lot 4xx isolé,
enfant avant parent, horloge en avance, canal privé (membre / autre couple / présence /
rejoin), changement de compte. Intégration Supabase locale : `broadcast_changes` reçu
< 1 s.

**Fini quand** : « deux téléphones, 100 écritures croisées, coupures aléatoires par proxy »
converge à 100 % trois fois de suite, délais mesurés côté serveur ; « Max rows » vérifié.

**Effort.** 7–9 jours.

---

### Phase 6 — Design system mobile

**Objectif.** [05](05-design-system-mobile.md), maquettes vivantes comprises.

**Fichiers.** `packages/theme/src/{tokens,createTheme,motion,contrast.test}.ts` (paires
autorisées) ; `apps/mobile/src/ui/*` + `ui/motion/{useMotion,springs}.ts` ;
`providers/{ThemeProvider,MotionProvider}` finalisés ; `app/(tabs)/_layout.tsx`
définitif (4 onglets + « + ») ; `app/sheets/create.tsx` ; `app/dev/ui.tsx` (galerie 4
thèmes, **bascules** densité / `motion.level` / échelle de police 1,3 et 2,0) ; **quatre
maquettes vivantes** : Jour, Mois, ProposalBubble.full, Constellation
([05 §7](05-design-system-mobile.md)) ; captures de référence dans `maestro/refs/`.

**Tests.** Contrastes des paires autorisées (4 thèmes) ; cibles ≥ 44 pt mesurées ; ESLint
motion (primitives Reanimated hors `ui/motion` = erreur) ; captures Maestro à échelle
système 1,3 et 2,0.

**Fini quand** : le couple valide la galerie **et les quatre maquettes** sur les deux
téléphones dans les quatre thèmes.

**Effort.** 7–9 jours.

---

### Phase 7 — Moteur calendrier et Accueil

**Objectif.** [06](06-moteur-calendrier.md) : logique pure, cinq vues, gestes arbitrés,
sur données de démonstration (repositories en mémoire).

**Fichiers.**

- `packages/domain/src/calendar/{window,items,agenda,layoutDay,layoutBands,snap,conflicts,grids,navigation}.ts` + tests.
- `features/calendar/{store.ts,hooks/useCalendarRange.ts,hooks/useCalendarItems.ts}`
  (filtre `visible.*`), `features/calendar/gestures/{worklets.ts,useDragEvent,useResizeEvent,useCreateByLongPress,usePinchSlotHeight}.ts`,
  `features/calendar/ui/{TimeGrid,DayColumn,EventBlock,Handles,AllDayBand,NowLine,DayPager,DateStrip,WeekView,MonthGrid,MonthCell,YearOverview,YearTile,ViewSwitch,TodayPill}.tsx`
  (déplacés depuis les maquettes, sans changement visuel).
- `features/home/{screen/HomeScreen.tsx,ui/TodayCard.tsx,ui/SoonList.tsx,ui/EmptyToday.tsx,hooks/useAgenda.ts}`,
  `app/(tabs)/index.tsx`, `app/(tabs)/calendar/{index,[view]}.tsx`.

**Tests.** Contrat de [06 §5](06-moteur-calendrier.md) : mise en page, bandes sur ligne de
mois, DST, **égalité worklets / domaine sur 1 000 cas**, `agendaFor`, gestes sur l'Android
de référence, **0 frame > 16 ms** sur 300 items ; captures de référence de Phase 6
inchangées ; cibles ≥ 44 pt sur `EventBlock`, poignées, `MonthCell`.

**Fini quand** : Accueil affiche aujourd'hui et les 7 prochains jours ; navigation au
swipe ; drag / resize / création par long-press ; colonne focus en Semaine ; densité,
`hourRange` et reduced-motion respectés ; anti-motifs de [05 §4.0](05-design-system-mobile.md)
absents à la revue.

**Effort.** 9–11 jours.

---

### Phase 8 — Événements personnels

**Objectif.** Premier flux complet, hors ligne et synchronisé.

**Fichiers.** `packages/domain/src/services/events.ts` (`createEvent`, `setWindow`,
`moveEvent`, `resizeEvent`, `validateWindow`), `domain/locations/` ;
`packages/data/src/geocode/{Geocoder,nominatim}.ts` (annulation, cache, 1 req/s,
`User-Agent`) ; `features/events/{hooks,ui/EventSheet,ui/EventPreview,ui/CategoryPicker,ui/LocationField,ui/ConflictHint,ui/HistoryList}.tsx`
(`HistoryList` lit `change_log` tiré en `pull-only` + `updated_by/updated_at`) ;
`app/sheets/event/{new,[id]}.tsx` ; `features/trash/*`, `app/settings/trash.tsx` ;
`HomeScreen` reçoit ses cartes réelles ; toast « Déplacé au mardi · Annuler ».

**Tests.** Domaine (`validateWindow`, multi-jours, DST) ; protocole deux téléphones :
créer hors ligne → déplacer → supprimer → restaurer → visible sur l'autre < 2 s en ligne ;
« Modifié par Mimi » ; `visible.partnerPersonalEvents = false` masque.

**Fini quand** : scénario automatisé vert ; export JSON identique sur les deux téléphones.
Soak : une semaine d'usage réel en parallèle.

**Effort.** 5–6 jours.

---

### Phase 9 — Activités à deux et propositions

**Objectif.** La bulle ([05 §4.2](05-design-system-mobile.md)) et la machine
([03 §6](03-modele-de-donnees.md)).

**Fichiers.** `packages/domain/src/proposals/{machine,diff}.ts`,
`services/proposals.ts` (`proposeActivity`, `accept`, `decline`, `counter`, `withdraw`,
`editAccepted` — n'écrivent jamais `notifications`) ;
`features/proposals/{ui/ProposalBubble (compact|full),ui/CounterProposalForm,ui/ProposalDiff,ui/ProposalsList,ui/ActivityBlock}.tsx`,
`app/sheets/activity/*`, chips « Propositions » du calendrier, carte sur `HomeScreen`.

**Tests.** Table de transitions complète en TS (dérivée de 03 §6, y compris contre sur
contre, retrait, tour périmé refusé, édition d'une activité acceptée) ; état écrit avant
animation ; deux téléphones : A propose, B contre-propose, A accepte → `accepted` chez
les deux avec les valeurs de B ; A propose puis retire ; refus → « Annuler » ; activité
refusée > 30 j → corbeille (pgTAP) ; reduced-motion ; cibles ≥ 44 pt.

**Fini quand** : scénario deux téléphones vert ; Q2, Q3, Q15 implémentées.

**Effort.** 6–7 jours.

---

### Phase 10 — Moments importants, chapitres, comptes à rebours, rappels locaux

**Objectif.** La mémoire vivante, et le **planificateur de notifications locales** (il sert
ici aux rappels J-7 / J-1, puis aux habitudes en Phase 12).

**Fichiers.** `packages/domain/src/countdowns/{target,label,reminders,widgetEntries}.ts`,
**`domain/notifications/scheduler.ts`** (horizon 14 j, plafond 60, appareil élu),
**`packages/data/src/push/LocalScheduler.ts`** (`expo-notifications`, local seulement) ;
`features/moments/{ui/Constellation,ui/MomentStar,ui/OccurrenceScreen,ui/ChapterList,ui/ChapterEditor,ui/MoodPicker,ui/MomentSheet,ui/AttachEvent}.tsx` ;
`features/countdowns/{ui/CountdownCard,ui/ReminderSettings,hooks/useNextDates}.ts` ;
`app/(tabs)/memories/{index,moments/[momentId]/[year]}.tsx`, `app/sheets/{moment,countdown}/*` ;
carte « Prochaine date » sur `HomeScreen` ; **intégration calendrier** : `repos.moments` /
`countdowns` branchés dans `useCalendarItems`, `MomentStar` rendu dans Jour (bande), Mois,
Année ; étape `moments` de `migrate-v1.ts` (`startDate` → `anniversary`, `milestones` →
`custom`) appliquée en vrai.

**Tests.** `defaultChapters` ; `dodos` (J-1 = « Encore 1 dodo », J = « C'est
aujourd'hui ») ; rappels planifiés puis replanifiés au changement de `reminder_days` /
`reminder_time` ; un seul appareil élu ; deux téléphones : créer « Première rencontre »,
ouvrir 2027 sur les deux hors ligne (même ligne après sync), renommer « Soirée », déplacer
un chapitre, y attacher un événement ; l'item apparaît dans Jour, Mois, Année ; cibles
≥ 44 pt sur `MomentStar`.

**Fini quand** : constellation avec les moments réels du couple ; compte à rebours de
l'accueil juste à minuit ; notification locale J-1 reçue en mode avion.

**Effort.** 8–10 jours.

---

### Phase 11 — Souvenirs et médias

**Fichiers.** `packages/data/src/media/{MediaPipeline,compress (react-native-compressor ≥ 2.0.3, maxUploadBytes = 50 Mo en gratuit),thumbnails (expo-video generateThumbnailsAsync),MediaUploader (TUS),signedUrls}.ts`,
`packages/domain/src/services/memories.ts` (depuis « + », une date, un événement, une
occurrence / un chapitre = souvenir lié) ;
`features/memories/{ui/MemorySheet,ui/MediaPicker,ui/MediaGrid,ui/MemoryCard,ui/MemoryStamp,ui/UploadQueue,screen/GalleryScreen}.tsx` ;
`ui/Lightbox` finalisée ; `app/(tabs)/memories/{gallery,[memoryId]}.tsx`,
`app/sheets/memory/*` ; **`supabase/functions/purge-trash/index.ts`** (clé service,
`storage.remove` par lots, test Deno) et son appel à l'ouverture ; étape `media-legacy`
de `migrate-v1.ts` (dix champs énumérés) appliquée en vrai ; **intégration calendrier** :
`MemoryStamp` dans Jour / Mois, `repos.memories` dans `useCalendarItems`.

**Tests.** Pipeline sur fichiers de référence (HEIC, EXIF portrait et `taken_at`, vidéo
4K 30 s → 1080p) ; **kill à 40 % d'une vidéo de 120 Mo → reprise sans réenvoi** ; ligne
`media` absente de l'outbox tant que `pending` ; deux téléphones : 10 photos + 1 vidéo
hors ligne → miniatures puis originaux sur l'autre ; corbeille → restauration → média
toujours là ; purge à 30 j simulés → objet Storage absent ; photo v1 visible.

**Fini quand** : galerie = v1 + nouveaux, hors ligne ; scénario vert.

**Effort.** 8–10 jours.

---

### Phase 12 — Habitudes

**Fichiers.** `packages/domain/src/recurrence/{describe,toRRule}.ts`,
`domain/habits/{status,catchUp}.ts` ; entrées « relance » du planificateur (créé en
Phase 10) et leur annulation quand l'autre a coché ;
`features/habits/{ui/HabitSheet,ui/RecurrenceField,ui/AdvancedRecurrence,ui/HabitPill,ui/DidYouSheet (Oui / Non / Rattraper),ui/CatchUpSheet,screen/HabitsScreen}.tsx` ;
chips « Habitudes » du calendrier, `app/sheets/habit/*` ; **intégration calendrier** :
`HabitPill` dans Jour / Semaine / Mois.

**Tests.** `describe` (« Tous les 3 mercredis ») ; `done` absorbant (Mimi « oui » 10:00,
Mimine « non » hors ligne 10:01 → `done`) ; deux téléphones cochent la même occurrence
hors ligne → une ligne ; rattrapage crée l'événement lié (Q8) ; relance locale à
`time_of_day + 60 min` en mode avion, annulée quand l'autre a coché ; bouton Rattraper
visible et accessible.

**Fini quand** : scénario vert ; soak d'une semaine en parallèle.

**Effort.** 6–7 jours.

---

### Phase 13 — Recherche et statistiques

**Fichiers.** `packages/domain/src/search/{periods,query,rank,facets}.ts` (dates
explicites « 14 février », « février 2024 », « 14/02/2024 » ; prénoms → facette
`person`) ; `packages/data/src/search/SearchRepository.ts` ; `domain/stats/*`,
`packages/data/src/stats/StatsRepository.ts` ;
`features/search/{ui/SearchBar,ui/Filters (type · période · catégorie · personne),ui/ResultRow (« via Notre anniversaire »),screen/SearchScreen}.tsx` ;
`features/stats/{ui/StatTile,ui/Sparkline,ui/CategoryRing,screen/StatsScreen}.tsx` ;
loupe sur `HomeScreen` ; `app/settings/stats.tsx` ; réglage `statsHidden`.

**Fini quand** : **60 phrases** du parseur vertes ; « Mimi restaurant août » et
« anniversaire » (souvenirs et chapitres liés) → résultats attendus sur le seed ;
3 statistiques égales aux requêtes SQL de contrôle ; recherche < 100 ms sur 5 000 lignes.

**Effort.** 5–6 jours.

---

### Phase 14 — Messagerie et présence temps réel

**Fichiers.** `packages/data/src/presence/{PresenceClient,heartbeat}.ts` (Realtime
Presence + `touch_presence()`), `domain/presence/{status,activity}.ts`,
`services/messages.ts` ;
`features/messages/{ui/MessageList (FlashList v2 : maintainVisibleContentPosition { startRenderingFromBottom, autoscrollToBottomThreshold: 0.2 } — pas de prop inverted),ui/MessageBubble,ui/ReactionBar,ui/Composer,ui/UnreadDivider,screen/MessagesScreen}.tsx` ;
`features/presence/{store.ts,ui/PresenceBadge,ui/ActivityBubble,ui/QuickMessageButton,hooks/useReportScreen}.ts` ;
`PresenceBadge` dans l'en-tête de tous les onglets ; badge non-lus sur l'onglet.

**Fini quand** : message reçu **< 1 s** au protocole deux téléphones ; **réaction posée
hors ligne visible chez l'autre < 1 s à la reconnexion** ; badge non-lus juste après
kill / relance ; suppression à 4:59 acceptée / 5:01 refusée (pgTAP) ; « Mimi écrit… » et
« Mimi consulte le calendrier » sur l'autre téléphone ; message rapide visible seulement
si l'autre est en ligne ; `visible.presenceDetail = false` masque l'écran ; cibles ≥ 44 pt
sur `ReactionBar`.

**Effort.** 6–7 jours.

---

### Phase 15 — Notifications push

**Prérequis** (T12) : projet Firebase gratuit (`google-services.json` hors git, injecté par
secret EAS ; clé de compte de service FCM V1 téléversée dans `eas credentials`), clé APNs
(créée par EAS avec le compte Apple), secret `EXPO_ACCESS_TOKEN` pour la fonction Edge.
Expo Push Service masque l'envoi, pas les identifiants.

**Fichiers.** `supabase/migrations/0011_notification_triggers.sql` (insertion sur message,
proposition, réponse, habitude faite, photos ajoutées à une occurrence ; respect des
préférences et des heures calmes), `supabase/functions/push/index.ts` (webhook → Expo Push
Service), `packages/data/src/push/{PushRegistrar (register_push_token),handlers}.ts`,
`features/settings/ui/NotificationPreferences.tsx`, `app/settings/notifications.tsx`,
routage des liens profonds dans `app/_layout.tsx`, suppression de la bannière si l'écran
concerné est au premier plan.

**Fini quand** : 5 payloads de référence verts en test Deno ; tap → route attendue sur les
deux OS ; préférence « propositions » désactivée → 0 push sur 10 essais ; heures calmes
respectées ; « Mimi a fait l'habitude » annule la relance locale de l'autre.

**Effort.** 4–5 jours.

---

### Phase 16 — Widgets iOS / Android

**Fichiers.** `apps/mobile/src/native/WidgetBridge.ts` (snapshot en props + image 512 px
écrite dans le `widgetsDirectory` de l'App Group / stockage partagé Android,
rafraîchissement) ; **iOS : `expo-widgets`** (stable depuis SDK 56, images via
`widgetsDirectory`, runtime isolé : pas de hooks ni d'async, tout passe par les props) —
`widgets/ios/CountdownWidget.tsx`, trois familles ; **repli** `apps/mobile/targets/nous-widget/`
(Swift WidgetKit via `@bacons/apple-targets`, seulement si le rendu Fraunces / crème /
grain n'est pas atteignable en Expo UI **et** si un Mac est disponible : itérer sur du
Swift sans Xcode = un build EAS par essai) ; **Android** : `widgets/android/CountdownWidget.tsx`
(`react-native-android-widget`) ; `features/countdowns/ui/WidgetSettings.tsx` (épinglage
par appareil et par instance, dans `kv`).

**Fini quand** : 3 tailles sur 2 OS ; capture à 00:01 après changement de jour **sans
ouvrir l'app** ; tap → écran du moment ; photo épinglée changée → widget à jour < 1 min
app ouverte.

**Effort.** 6–8 jours.

---

### Phase 17 — Polish UX, réglages, onboarding

**Contenu.** Onboarding mobile ; écran Réglages complet : **Affichage** (`DisplayPreferences`
: densité, animations, informations visibles, vue par défaut, semaine, plage horaire,
grain), Présence, Notifications, Statistiques masquées, Corbeille, Synchronisation
(échecs, horloge), Données (export JSON, import) ; audit reduced-motion écran par
écran ; haptiques ; états vides et erreurs ; transitions partagées (vignette →
lightbox) ; revue de la copy avec le couple ; palette « bleu » et sombre partout ;
« la demande » portée en natif (bonus).

**Fini quand** : « masquer les habitudes » retire les `HabitPill` de Jour / Mois (test) ;
liste d'irritants à zéro sur un **script de test écrit** de 30 minutes joué par le couple.

**Effort.** 6–8 jours.

---

### Phase 18 — Tests complets

**Contenu.** Parcours critiques × hors ligne / en ligne : **Android automatisé (Maestro),
iOS par check-list manuelle signée** (ou simulateur / `maestro-ios-device` si un Mac est
disponible) ; chaos de sync par **proxy** (10 min de coupures aléatoires sur deux appareils) ; charge locale
(5 000 événements, 20 000 messages, 3 000 médias) ; audit VoiceOver / TalkBack sur les
six écrans de [05 §8](05-design-system-mobile.md) ; revue de sécurité (RLS, Storage,
fonctions, secrets, inscriptions fermées).

**Fini quand** : couverture `domain` ≥ 90 %, `data` ≥ 80 % ; 0 divergence après chaos ;
ouverture à froid < 1,5 s et 0 frame > 32 ms en scroll Semaine sur l'Android de
référence ; recherche < 100 ms ; audit a11y sans bloquant.

**Effort.** 5–6 jours.

---

### Phase 19 — Optimisation et préparation production

**Contenu.** Profilage et corrections ; limites de cache d'images et purge locale ;
builds EAS `production` iOS (TestFlight interne — builds expirant après 90 jours,
reconstruction trimestrielle au runbook) et Android (APK signé, lien privé) ;
`expo-updates` ; Supabase : inscriptions fermées, sauvegarde hebdomadaire (`backup.yml`,
le plan gratuit n'a ni PITR ni sauvegardes quotidiennes), purge planifiée par `pg_cron`
vérifiée, quotas Storage et egress, alertes, décision plan Pro (T9) ; supervision (Sentry RN + Edge
Functions) ; `docs/RUNBOOK.md` (réactiver un projet en pause, réinitialiser un mot de
passe, restaurer une sauvegarde, réémettre un build, renouveler TestFlight) ; `README.md`
du monorepo ; rejeu et vérification des trois étapes de `migrate-v1.ts` ; bascule du
couple sur l'app.

**Fini quand** : les deux téléphones tournent la version production ; données v1
visibles ; web v1 fonctionne toujours ; sauvegarde restaurée une fois sur l'instance locale.

**Effort.** 5–7 jours.

---

## 4. Après la roadmap (hors périmètre, prévu par l'architecture)

- **Portage des sections v1** (aventures, mots, Airbnb, carte, bucket list, awards,
  capsules, moodboard) vers des tables dédiées et des écrans mobiles, une section par
  itération, **chacune commençant par une vraie migration de données** (`items` n'est
  pas synchronisée par le mobile).
- **Desktop / web** : Expo web ou réécriture des pages sur `packages/domain`.
- **Live Activities** iOS pour le jour J d'un moment important.

## 5. Estimation globale

Somme des efforts indicatifs : **≈ 125–155 jours** de développement pour une personne
assistée, phases 1 à 19 (spike compris). Les phases 6, 7, 10 et 11 sont les plus
incertaines (UI riche, gestes, médias) ; les phases 3, 4, 5 sont les plus déterminantes :
ne pas les compresser.

## 6. Risques et parades

| Risque | Parade |
| ------ | ------ |
| Sync maison qui « presque » marche | Règles nommées et testées une à une ([04 §12](04-sync-offline.md)) avant toute UI ; FakeServer avec commit retardé et purge ; convergence 3/3 par proxy. |
| Créations concurrentes hors ligne (même occurrence, même habitude) | Ids UUID v5 dérivés de la clé naturelle ; test dédié en Phase 5. |
| Grille qui ressemble à Google Calendar | Partis pris et anti-motifs écrits ([05 §4.0](05-design-system-mobile.md)) ; maquettes validées par le couple **avant** le moteur (Phase 6). |
| Gestes qui se battent (scroll / drag / pinch / pager / swipe-back) | Table d'arbitrage ([06 §3.7](06-moteur-calendrier.md)) ; calendrier sur un seul écran ; spike de la Phase 1. |
| Grille lente sur Android modeste | Mesure dès le spike puis en Phase 7 (`useFrameCallback`) sur l'Android de référence ; gestes sur le thread UI. |
| Natif des widgets | Snapshot simple ; `expo-widgets` (stable, iOS, images) comme voie principale ; Swift seulement avec un Mac. |
| Alignement des modules natifs (Reanimated 4, worklets, nitro-modules, gorhom ≥ 5.2.14, compressor ≥ 2.0.3) | `expo@^57.0.17` épinglé, `pnpm.overrides`, `expo doctor` en CI, une montée de SDK par an. |
| **Maestro ne pilote pas d'iPhone physique** ; sans Mac, pas de simulateur iOS | Protocole asymétrique (Android automatisé, iOS check-list) ; T11 tranchée. |
| Builds EAS limités (15 iOS + 15 Android par mois en gratuit) | Dev build seulement quand une dépendance native change ; JS via serveur de dev / EAS Update ; budget par phase. |
| Projet Supabase **en pause** (restaurable en un clic pendant 90 jours seulement — avant le 2026-11-15) et re-pause après 7 jours sans activité | Restauration en Phase 1 ; `keep-alive.yml` qui touche une table ; plan Pro envisagé en Phase 19 (T9). |
| Storage gratuit : 1 Go, **50 Mo par fichier**, egress 5 Go/mois | Volume mesuré en Phase 1 ; `maxUploadBytes` dérivé du plan ; originaux conservés localement ; décision plan Pro avant la Phase 11. |
| Branching Supabase réservé au plan Pro | Instance locale (CLI + Docker) pour les tests ; `pg_cron` est, lui, disponible en gratuit (mais s'arrête si le projet est en pause). |
| Aucune sauvegarde du nouveau schéma sur le plan gratuit | `backup.yml` hebdomadaire dès la Phase 3 ; export JSON depuis l'app. |
| Exécution en arrière-plan non garantie (iOS, Doze) | Rien n'en dépend : rappels programmés à l'avance, sync au premier plan et au retour en ligne, push serveur pour l'inter-personnes. |
| Dérive d'horloge entre téléphones | `sync_guard` ramène l'avance à `now()` ; horloge locale corrigée par `serverOffset` ; règles absorbantes là où l'ordre compte. |
| Perte de données à la migration v1 | Étapes idempotentes, à sec d'abord, sauvegarde JSON + `pg_dump` avant, web v1 conservé, mapping explicite des comptes (T8). |
| Compte Apple / Mac | Compte Apple prérequis de la Phase 1 ; EAS pour tout, Xcode seulement en Phase 16 si Swift nécessaire. |
