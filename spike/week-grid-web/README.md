# Spike web — la grille Semaine dans un navigateur

Jumeau du spike React Native ([`../week-grid`](../week-grid/README.md)), en web.
Même logique de domaine, mêmes gestes, mêmes réglages.

Il existe parce que les deux téléphones du couple ne recevront pas le même
client : un **Galaxy S24 Ultra** aura l'application React Native, un **iPhone 16**
aura la **PWA** — sans compte Apple Developer, il n'y a pas d'app native durable
sur iPhone ([`docs/09-zero-depense.md`](../../docs/09-zero-depense.md), ADR-009).
La question à trancher n'est donc pas seulement « React Native tient-il ? », mais
aussi : **est-ce qu'une web app tient le calendrier de Nous sur un iPhone 16 ?**

## Ce qu'il contient

- **Semaine** — 48 créneaux × 7 jours, vraies dates de la semaine en cours, marque
  « aujourd'hui », ligne « maintenant ». Appui long de 350 ms → soulèvement →
  glissé accroché aux 30 minutes et aux colonnes ; poignées de début et de fin ;
  appui long sur le fond → création par étirement ; pincement à deux doigts pour
  la hauteur de créneau, point focal conservé ; balayage horizontal franc pour
  changer de semaine ; appui sur un en-tête pour élargir une colonne ;
  défilement automatique quand on traîne un bloc vers le bord.
- **Messages** — messagerie factice, uniquement pour juger le clavier de l'iPhone
  (bug de viewport connu d'iOS 26.0, corrigé en 26.1).
- **Mesures** — ce n'est pas une démonstration mais un **instrument**. Il répond
  aux questions restées ouvertes sur l'iPhone ([09 §10](../../docs/09-zero-depense.md)) :
  fréquence réelle de l'écran et budget par frame, quota et persistance du
  stockage hors ligne, écriture puis relecture de 20 Mo, notification affichée
  sans aucun serveur, badge d'icône, marges sûres, mode « écran d'accueil »,
  service worker et hors ligne. Le bouton **Copier le rapport** produit un texte
  à recoller dans la conversation.

Volontairement absent : nuit repliée, vues Jour/Mois/Année, données réelles,
thème sombre, Web Push (il faudra des clés VAPID et une fonction Edge).

## L'essayer

### En dix secondes, sur les deux téléphones

Ouvrez le lien de l'artefact publié dans la conversation. Rien à installer.
Vous jugez les gestes, le clavier, la fréquence d'écran. Pas de service worker,
donc ni hors ligne ni notifications par ce chemin.

### Pour de vrai, sur l'iPhone (hors ligne, notifications, icône)

Il faut du HTTPS : ni `localhost` ni une adresse en 192.168 ne suffisent pour un
service worker et une installation propre.

```bash
cd spike/week-grid-web
npx --yes http-server -p 8099 .        # test local, sans service worker
npx --yes vercel deploy --prod         # ou : mise en ligne HTTPS (compte gratuit)
```

Sur l'iPhone : ouvrir l'adresse HTTPS dans Safari → **Partager** → **Sur l'écran
d'accueil** → ouvrir depuis l'icône. L'onglet Mesures doit alors afficher
« Mode web app : oui » et « Service worker : enregistré ».

Aucune dépendance à installer : ce sont des modules ES servis tels quels.

## Ce qu'on mesure

| Critère | Où | Attendu |
| ------- | -- | ------- |
| Fréquence de l'écran | onglet Mesures, après un glissé | 120 Hz sur le S24 Ultra, 60 Hz sur l'iPhone 16 |
| Frames longues pendant un glissé | compteur en haut à droite | 0 au-delà du budget affiché |
| Appui long puis glissé < 8 px | Semaine | la grille défile, le bloc ne bouge pas |
| Appui long de 350 ms | Semaine | le bloc se soulève et suit le doigt, accroché aux 30 min |
| Poignées | Semaine, après un appui simple | début et fin déplaçables, cibles atteignables |
| Pincement | Semaine, deux doigts | la hauteur change, le créneau sous les doigts ne bouge pas, **la page ne zoome pas** |
| Balayage à 45° | Semaine | défile ; un balayage franc horizontal change de semaine |
| Menu contextuel iOS | Semaine, appui long | il ne doit **jamais** apparaître |
| Clavier | Messages | le champ reste visible, aucun saut à l'ouverture ni à la fermeture |
| Stockage | Mesures | 20 Mo écrits puis relus intègres ; persistance accordée ou non |
| Notification sans serveur | Mesures | la notification s'affiche ; le badge apparaît sur l'icône |
| Hors ligne | Mesures | mode avion, fermer, rouvrir l'icône : la grille s'ouvre |
| Verdict | les deux | « ça sent l'app » ou « ça sent le site » |

Le verdict de l'iPhone décide du client iPhone (PWA acceptée, ou renoncement à
l'iPhone en v1). Notez-le dans [`docs/07-questions-ouvertes.md`](../../docs/07-questions-ouvertes.md)
(T10, T13) et dans l'ADR-001.

## Vérifier le code

```bash
../week-grid/node_modules/.bin/tsc -p jsconfig.json    # types (JSDoc, strict)
npx --yes http-server -p 8099 . &                      # serveur
NODE_PATH=$(npm root -g) node tools/smoke.mjs          # test tactile en Chromium
node tools/inline.mjs > dist/nous-spike-web.html       # version en un seul fichier
python3 tools/make-icons.py                            # icônes (sans dépendance)
```

Le test de fumée vérifie l'arbitrage des gestes, c'est-à-dire la seule chose qui
puisse vraiment casser : qu'un mouvement avant 350 ms défile, qu'un appui long
prenne la main, que le glissé s'accroche aux 30 minutes, que l'appui simple
sélectionne.
