# ADR-010 — Le jour d'abord : la grille Semaine à sept colonnes est abandonnée

**Statut** : proposé le 2026-09-07, après essai de la maquette sur le Galaxy S24 Ultra.
**Modifie** [05 §4](../05-design-system-mobile.md), [06 §4](../06-moteur-calendrier.md) et
la Phase 7 de la [roadmap](../ROADMAP.md).

## Contexte

La conception prévoyait cinq vues, dont une Semaine à sept colonnes et quarante-huit
créneaux, avec en portrait une « colonne focus » élargissant le jour tapé à 2,6 parts contre
0,73 pour les six autres. La maquette jouable a été installée sur le téléphone réel.

Verdict de l'utilisateur, mot pour mot : « vue semaine c'est trop compacte faut cliquer sur
un jour genre on a tous les jours de la semaine et qd on clique ca montre le jour faut pas
montrer tout le calendrier des semaines ou alors fr un truc + simpliste ».

Il a raison, et les chiffres le disent : sur 393 points de large, sept colonnes et une
gouttière de 44 px laissent **47 px par jour**. Un titre n'y tient pas, une carte n'y est
plus une carte posée mais un tesson. La colonne focus ne réglait rien : elle rendait six
jours sur sept illisibles pour en sauver un, et ajoutait un état à comprendre.

Trois conceptions de remplacement ont été produites indépendamment, puis notées par deux
juges (usage quotidien, identité visuelle) : « Sept tranches, une page » 16/20 et 16/20,
« Le Fil » 15 et 15, « Le Pli » 12 et 13.

## Décision

**Le calendrier est un seul écran : une journée en pleine page, surmontée d'un bandeau de
sept coupes.** Il n'y a plus de vue Semaine, donc plus de sélecteur de vues.

1. **La page du jour** occupe toute la largeur. Une carte y redevient une carte : titre
   entier, heure écrite « de 9 h 30 à 11 h » en serif italique. Les cinq partis pris
   ([05 §4.0](../05-design-system-mobile.md)) y sont enfin vérifiables, ce qui n'était pas
   le cas dans 47 px. Tous les gestes survivent et se simplifient : une seule colonne, donc
   plus aucun arbitrage latéral pendant un glissé.
2. **Le bandeau est une coupe, pas une rangée de marques.** Chaque jour est une tranche de
   papier de 7 h à 23 h de haut en bas, où les marques sont posées **à leur heure réelle**.
   On y lit un rythme — matin creux, soirée pleine — jamais un titre. Au-delà de quatre
   marques, on garde la première, la dernière et deux du milieu : prendre les quatre
   premières ferait croire à une journée qui s'arrête à midi.
3. **La phrase du jour** est écrite sous la date, en serif italique : « libre de 13 h 30 à
   17 h », « rien avant 18 h », « la journée est à vous ». C'est elle qui répond à la
   question qu'on se pose en ouvrant l'app, et qu'aucune marque ne sait poser. Logique pure,
   testable (`domain/phrase.js`).
4. **La charge d'un jour se dit par le poids d'encre de son chiffre**, pas par une jauge.
   Les deux juges ont écarté la jauge de remplissage et le fond dégradé comme des
   glissements vers le tableau de bord, interdits par [05 §4.0](../05-design-system-mobile.md).
5. **Le Mois survit** comme sélecteur de date à mémoire, ouvert depuis le nom du mois dans
   le titre : c'est là qu'on va pour atteindre le 14 novembre ou retrouver « le mois où on
   est allés à la mer » à sa grappe de souvenirs. L'Année reste douze vignettes.
6. **Le `ViewSwitch` disparaît** du kit et de la roadmap. L'anti-motif « segmenté de vues en
   haut de l'écran » devient impossible par construction, et le bas de l'écran se dégage
   pour la seule pilule qui reste, « Aujourd'hui », visible uniquement hors d'aujourd'hui.

## Conséquences

- L'état du calendrier n'est plus `{ view, date }` mais `{ day, weekStart, notebook, slotZoom }`.
- `layoutDay` reste utilisé tel quel ; `layoutBands` ne sert plus que dans le Mois.
- Le protocole de gestes ([06 §3.7](../06-moteur-calendrier.md)) perd le cas le plus difficile,
  le glissé d'une colonne à l'autre, et gagne le dépôt sur une tranche du bandeau pour
  déplacer un événement d'un jour à l'autre à la même heure.
- Le portage web pour l'iPhone y gagne : une colonne unique et un bandeau se réimplémentent
  bien plus fidèlement en pointer events que sept colonnes et une colonne focus animée.
- Effort de la Phase 7 revu à la baisse : la vue la plus coûteuse disparaît.

## Ce qui reste à trancher avec le couple

- Le bandeau suffit-il comme vue d'ensemble, ou faut-il ouvrir le Mois plus tôt ?
- Les marques de la coupe sont-elles lisibles sur les deux écrans ?
- La grille horaire est-elle gardée, ou faut-il aller jusqu'au bout du « truc plus
  simpliste » et supprimer les heures dessinées au profit d'une liste ? La proposition
  « Le Fil » (15/20) décrit cette variante ; elle n'a pas été retenue parce qu'elle rend le
  déplacement d'un événement plus laborieux, mais elle reste la meilleure porte de sortie si
  la grille déplaît.
