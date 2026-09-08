# Spike — vue Jour (Phase 1, porte de décision)

Projet Expo **jetable**. Il ne sert qu'à répondre à une question : une journée de
48 créneaux avec long-press → drag → accrochage 30 min → poignées → pinch, et un
scroll qui ne se bat pas avec le drag, est-ce que « ça sent l'app » ou « ça sent
le site » ? Le code est jeté ensuite ; on garde la décision et les réglages de
gestes ([docs/01-stack.md §6](../../docs/01-stack.md)).

La grille Semaine à sept colonnes qu'il contenait d'abord a été **abandonnée**
après essai sur téléphone réel : 47 px par jour, c'est un tesson, pas une carte
([ADR-010](../../docs/adr/ADR-010-jour-dabord.md)). Elle survit dans un onglet,
pour comparaison seulement.

Ce spike-ci vise le **Galaxy S24 Ultra**, qui recevra l'application React Native.
L'iPhone 16 recevra la PWA : son jumeau web est dans
[`../week-grid-web`](../week-grid-web/README.md), et c'est **lui** qu'il faut
juger sur l'iPhone.

**Il se teste sans rien payer** : via l'app Expo Go (gratuite) sur les deux téléphones,
iPhone compris, sans compte Apple Developer ([docs/09 §3](../../docs/09-zero-depense.md)).

## Ce qu'il contient

- `src/domain/time.ts` — créneaux, accrochage, déplacement, redimensionnement (logique pure,
  marquée `'worklet'` ici pour tourner sur le thread UI).
- `src/domain/layout.ts` — chevauchements : deux items = cartes posées l'une sur l'autre,
  au-delà = colonnes.
- `src/domain/phrase.ts` — la phrase du jour (« libre de 13 h 30 à 17 h ») et le poids
  d'encre du chiffre dans le bandeau. Port fidèle de la version web, vérifié par
  différentiel sur 20 000 tirages.
- `src/domain/dates.ts` — semaine affichée, noms français en dur (Hermes n'embarque pas
  toujours l'ICU complet sur Android).
- `src/screens/DayScreen.tsx` — **la vue principale** : une journée en pleine largeur,
  scroll vertical natif, pinch de hauteur de créneau avec point focal conservé,
  auto-défilement au bord pendant un drag, pager horizontal (jour ±1, la page suit le
  doigt), ligne « maintenant », compteur de frames longues.
- `src/components/DayStrip.tsx` — le bandeau : sept tranches de 7 h à 23 h où les marques
  sont posées à leur heure réelle. Il donne le rythme d'une journée, jamais son contenu.
- `src/screens/WeekScreen.tsx` — l'ancienne grille sept colonnes, gardée pour comparaison :
  colonne focus en portrait (2,6 parts contre 0,73), pager (semaine ±1).
- `src/components/DayColumn.tsx` — fond de colonne : long-press 350 ms → fantôme de deux
  créneaux que l'on étire → création ; tap → désélection.
- `src/components/EventBlock.tsx` — bloc : long-press 350 ms → soulèvement (haptique) →
  drag accroché au créneau et à la colonne → dépose ; tap → sélection ; poignées
  (maintien 120 ms puis glisser) pour changer le début ou la fin.
- `src/screens/ChatScreen.tsx` — messagerie factice, uniquement pour juger le clavier.
- `src/theme.ts` — sous-ensemble des tokens de Nous, palette **bleue** (la vôtre) et vos
  deux couleurs. Fraunces n'est pas embarquée (serif système en attendant).

Volontairement absent : nuit repliée, vues Jour/Mois/Année, données réelles, thème sombre,
et surtout **aucun `expo-notifications`** (ce module fait planter Expo Go Android SDK 57).

## Lancer sur vos téléphones (gratuit)

1. Installez **Expo Go** depuis l'App Store / le Play Store, puis **désactivez sa mise à
   jour automatique** le temps du test (une mise à jour de SDK casse le projet).
2. Créez un compte Expo gratuit sur expo.dev. Sur l'iPhone, Expo Go exige d'être
   connecté **au même compte** que la ligne de commande.
3. Sur le PC (Windows, Linux ou Mac), téléphones et PC sur le même Wi-Fi :

```bash
cd spike/week-grid
npm install
npx expo login
npx expo start --go          # mode Expo Go ; --tunnel si le Wi-Fi bloque
```

4. Scannez le QR code (appareil photo sur iPhone, Expo Go sur Android).

Les versions natives du spike (Reanimated 4.5.1, worklets 0.10.1, Gesture Handler 2.32)
sont celles embarquées dans Expo Go SDK 57 : ne les changez pas.

### Mesure de référence Android (optionnelle, gratuite)

Expo Go tourne en mode développement : le compteur de frames y est pessimiste. Pour la
vraie mesure sur l'Android du couple, un build release local (Android Studio + JDK 17,
sous Linux ou WSL2) :

```bash
npx expo run:android --variant release
```

Aucun build iOS n'est nécessaire pour le spike ; Expo Go suffit à juger les gestes.

## Ce qu'on mesure (critères de [docs/ROADMAP.md](../../docs/ROADMAP.md), Phase 1)

| Critère | Comment |
| ------- | ------- |
| 0 frame au-delà du budget de l'écran, sur le S24 Ultra en build release | le compteur en haut à droite : il mesure la cadence réelle (≈ 120 Hz → budget 8,3 ms) et se remet à zéro à chaque geste |
| 0 geste perdu sur 50 essais | 25 drags de bloc, 15 redimensionnements, 10 créations ; noter chaque raté |
| Long-press puis déplacement < 8 px ne bloque pas le scroll | poser le doigt, bouger un peu avant 350 ms : la grille doit défiler |
| Drag au bord fait défiler | traîner un bloc vers le haut/bas de l'écran |
| Pinch garde le point focal | le créneau sous les doigts reste sous les doigts |
| Swipe à 45° = scroll, pas pager | un swipe franc horizontal change de jour ; un swipe en diagonale défile |
| Le bandeau se lit | les marques disent le rythme de chaque jour à bout de bras, sans zoom |
| La phrase dit vrai | « libre de … à … » correspond bien au creux qu'on voit dans la journée |
| Clavier de la messagerie | le champ reste visible, la liste suit, aucun saut à l'ouverture/fermeture |
| Le verdict du couple | « ça sent l'app » ou « ça sent le site » |

Notez les résultats dans `docs/07-questions-ouvertes.md` (T10) et la décision dans
`docs/adr/ADR-001-stack-react-native-expo.md`.

## Si quelque chose ne va pas

- « Project is incompatible with this version of Expo Go » : Expo Go s'est mis à jour vers
  un autre SDK ; sur Android, `npx expo start --go` propose de réinstaller la bonne version.
- Sur iPhone, « This project belongs to X, and you're signed in as Y » : connectez Expo Go
  et `npx expo login` au même compte.
- Le téléphone ne trouve pas le serveur : `npx expo start --go --tunnel`.
- Le scroll se bat avec le drag : c'est précisément ce que le spike doit révéler ; noter
  sur quel OS et dans quelles conditions.

## L'APK, sans PC

Chaque poussée sur ce dossier reconstruit l'APK dans GitHub Actions et le publie en
pré-version (`.github/workflows/spike-android.yml`). Rien à installer, rien à payer :
le dépôt est public, donc les minutes sont gratuites.
