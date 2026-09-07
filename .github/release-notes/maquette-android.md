Maquette jetable de la vue Semaine, à installer sur le Galaxy S24 Ultra pour juger les
gestes et la fluidité. **Ce n'est pas l'application** : c'est le prototype qui sert à
décider avant d'écrire le vrai code.

### Avant d'installer

Dans Réglages → Sécurité et confidentialité, vérifier qu'**Auto Blocker** et **Advanced
Protection** sont éteints. Si l'un des deux est actif, aucune installation n'est possible
et le réglage « installer des applications inconnues » est lui-même grisé.

### Installer

Télécharger le fichier `.apk` ci-dessous depuis le téléphone, l'ouvrir, autoriser Chrome à
installer des applications inconnues, puis « Installer quand même » sur l'avertissement de
Play Protect. L'avertissement est normal : l'application ne vient pas du Play Store.

### Ce qu'on mesure

Le compteur en haut à droite affiche la fréquence réelle de l'écran et le budget par image,
soit 8,3 ms si le téléphone est bien en 120 Hz. Il se remet à zéro à chaque geste.

- appui long de 350 ms sur un événement, puis glissé : il doit s'accrocher aux demi-heures
- bouger le doigt **avant** l'appui long : la grille doit défiler, pas déplacer le bloc
- appui simple : deux poignées apparaissent pour changer le début et la fin
- appui long sur une zone vide : création par étirement
- pincement à deux doigts : la hauteur des créneaux change, le créneau sous les doigts ne bouge pas
- balayage horizontal franc : semaine suivante ou précédente
- appui sur un jour : sa colonne s'élargit

Le détail et la grille de relevé sont dans `spike/week-grid/README.md`.

### L'équivalent web

La même grille existe en version web, à essayer sur les deux téléphones sans rien
installer, et c'est elle qui sera le client de l'iPhone.
