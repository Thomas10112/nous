Maquette jetable de la **vue Jour**, à installer sur le Galaxy S24 Ultra pour juger les
gestes et la fluidité. **Ce n'est pas l'application** : c'est le prototype qui sert à
décider avant d'écrire le vrai code.

La grille Semaine à sept colonnes a été abandonnée (ADR-010) : 47 px par jour, c'est un
tesson, pas une carte. L'app s'ouvre donc sur une journée en pleine largeur, surmontée
d'un bandeau de sept tranches où chaque marque est posée à son heure réelle. L'onglet
Semaine reste là, uniquement pour comparer une dernière fois.

### Avant d'installer

Dans Réglages → Sécurité et confidentialité, vérifier qu'**Auto Blocker** et **Advanced
Protection** sont éteints. Si l'un des deux est actif, aucune installation n'est possible
et le réglage « installer des applications inconnues » est lui-même grisé.

### Installer

Télécharger le fichier `.apk` ci-dessous depuis le téléphone, l'ouvrir, autoriser Chrome à
installer des applications inconnues, puis « Installer quand même » sur l'avertissement de
Play Protect. L'avertissement est normal : l'application ne vient pas du Play Store.

### Ce qu'on regarde d'abord

- le **bandeau** suffit-il à voir la semaine d'un coup d'œil, ou faut-il ouvrir un mois ?
- les **marques dans les tranches** sont-elles lisibles à bout de bras ?
- la **phrase sous la date** (« libre de 13 h 30 à 17 h ») dit-elle la bonne chose ?
- la **grille horaire** : on la garde, ou on va vers une simple liste d'heures écrites ?

### Ce qu'on mesure

Le compteur en haut à droite affiche la fréquence réelle de l'écran et le budget par image,
soit 8,3 ms si le téléphone est bien en 120 Hz. Il se remet à zéro à chaque geste.

- appui long de 350 ms sur un événement, puis glissé : il doit s'accrocher aux demi-heures
- bouger le doigt **avant** l'appui long : la page doit défiler, pas déplacer le bloc
- appui simple : deux poignées apparaissent pour changer le début et la fin
- appui long sur une zone vide : création par étirement
- pincement à deux doigts : la hauteur des créneaux change, le créneau sous les doigts ne bouge pas
- balayage horizontal sur la page : jour suivant ou précédent (la page suit le doigt)
- balayage horizontal sur le bandeau : semaine suivante ou précédente
- appui sur un jour du bandeau : il s'ouvre

Le détail et la grille de relevé sont dans `spike/week-grid/README.md`.

### L'équivalent web

La même vue existe en version web, à essayer sur les deux téléphones sans rien
installer, et c'est elle qui sera le client de l'iPhone.
