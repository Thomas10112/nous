# Spike — vue Semaine (Phase 1, porte de décision)

Projet Expo **jetable**. Il ne sert qu'à répondre à une question : sur vos deux
téléphones, une grille de 48 créneaux × 7 jours avec long-press → drag → accrochage
30 min → poignées → pinch, et un scroll qui ne se bat pas avec le drag, est-ce que
« ça sent l'app » ou « ça sent le site » ? Le code est jeté ensuite ; on garde la
décision et les réglages de gestes ([docs/01-stack.md §6](../../docs/01-stack.md)).

## Ce qu'il contient

- `src/domain/time.ts` — créneaux, accrochage, déplacement, redimensionnement (logique pure,
  marquée `'worklet'` ici pour tourner sur le thread UI).
- `src/domain/layout.ts` — chevauchements : deux items = cartes posées l'une sur l'autre,
  au-delà = colonnes.
- `src/screens/WeekScreen.tsx` — la grille : colonne focus en portrait (2,6 parts contre
  0,73), scroll vertical natif, pinch de hauteur de créneau avec point focal conservé,
  auto-défilement au bord pendant un drag, pager horizontal (semaine ±1), ligne
  « maintenant », compteur de frames longues.
- `src/components/DayColumn.tsx` — fond de colonne : long-press 350 ms → fantôme de deux
  créneaux que l'on étire → création ; tap → désélection.
- `src/components/EventBlock.tsx` — bloc : long-press 350 ms → soulèvement (haptique) →
  drag accroché au créneau et à la colonne → dépose ; tap → sélection ; poignées
  (maintien 120 ms puis glisser) pour changer le début ou la fin.
- `src/screens/ChatScreen.tsx` — messagerie factice, uniquement pour juger le clavier.
- `src/theme.ts` — sous-ensemble des tokens de Nous. Fraunces n'est pas embarquée
  (serif système en attendant).

Volontairement absent : nuit repliée, vues Jour/Mois/Année, données réelles, thème sombre.

## Construire et installer

Prérequis : compte Expo (gratuit), compte Apple Developer (pour l'iPhone), les deux
téléphones enregistrés (`eas device:create` pour iOS).

```bash
cd spike/week-grid
npm install
npx expo-doctor
npx eas-cli login
npx eas-cli build --profile development --platform android   # APK à installer directement
npx eas-cli build --profile development --platform ios       # profil ad hoc, iPhone enregistré
npx expo start --dev-client                                  # puis ouvrir l'app sur chaque téléphone
```

Le plan EAS gratuit donne 15 builds par OS et par mois : un build de développement
suffit, tout le reste passe par le serveur de développement.

## Ce qu'on mesure (critères de [docs/ROADMAP.md](../../docs/ROADMAP.md), Phase 1)

| Critère | Comment |
| ------- | ------- |
| 0 frame > 16 ms pendant un drag sur l'Android du couple | le compteur en haut à droite, remis à zéro à chaque geste |
| 0 geste perdu sur 50 essais | 25 drags de bloc, 15 redimensionnements, 10 créations ; noter chaque raté |
| Long-press puis déplacement < 8 px ne bloque pas le scroll | poser le doigt, bouger un peu avant 350 ms : la grille doit défiler |
| Drag au bord fait défiler | traîner un bloc vers le haut/bas de l'écran |
| Pinch garde le point focal | le créneau sous les doigts reste sous les doigts |
| Swipe à 45° = scroll, pas pager | un swipe franc horizontal change de semaine ; un swipe en diagonale défile |
| Colonne focus | taper un en-tête de jour : la colonne s'élargit avec un ressort, les autres se resserrent |
| Clavier de la messagerie | le champ reste visible, la liste suit, aucun saut à l'ouverture/fermeture |
| Le verdict du couple | « ça sent l'app » ou « ça sent le site » |

Notez les résultats dans `docs/07-questions-ouvertes.md` (T10) et la décision dans
`docs/adr/ADR-001-stack-react-native-expo.md`.

## Si quelque chose ne va pas

- Le drag ne s'active pas : vérifier que l'app tourne dans le **dev client** (pas Expo Go)
  et que `react-native-worklets` est bien installé (`npx expo-doctor`).
- Le scroll se bat avec le drag : c'est précisément ce que le spike doit révéler ; noter
  sur quel OS et dans quelles conditions.
