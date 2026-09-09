Maquette jetable de la **vue Jour**, à installer sur le Galaxy S24 Ultra pour juger les
gestes et la fluidité. **Ce n'est pas l'application** : c'est le prototype qui sert à
décider avant d'écrire le vrai code.

L'app s'ouvre sur une journée en pleine largeur, surmontée d'un bandeau de sept tranches où
chaque marque est posée à son heure réelle (ADR-010 : la grille Semaine à sept colonnes est
abandonnée, 47 px par jour ne font pas une carte). L'onglet Semaine reste là pour comparer
une dernière fois.

### Ce qui a changé depuis la version précédente

- **La nuit est repliée.** La journée va de 7 h à 23 h ; le reste tient dans deux bandes qui
  disent ce qu'elles cachent et se déplient d'un tap. Avant, la page s'ouvrait sur dix
  heures de vide.
- **Les cœurs sont dessinés**, donc enfin de la couleur de votre palette. Ils sortaient en
  rouge vif parce qu'Android confiait le caractère `♥` à sa police d'emojis.
- **Le compteur ne ment plus.** Il annonçait « 144 Hz », une fréquence que votre écran
  n'atteint pas. Il mesure maintenant la période réelle par vote majoritaire, ne se calibre
  que pendant un geste, et affiche « … » tant qu'il n'est pas sûr. Il est aussi armé par
  TOUS les gestes : le « 0/0 » d'avant ne voulait pas dire « aucune image longue », il
  voulait dire « rien n'a été mesuré ».
- **La vue Semaine a de vraies dates.** Elle numérotait ses jours en dur et posait le cœur
  « aujourd'hui » sur demain.

### Avant d'installer

Dans Réglages → Sécurité et confidentialité, vérifier qu'**Auto Blocker** et **Advanced
Protection** sont éteints. Si l'un des deux est actif, aucune installation n'est possible
et le réglage « installer des applications inconnues » est lui-même grisé.

Pour que la mesure veuille dire quelque chose : Paramètres → Affichage → **Fluidité des
mouvements = Adaptatif**. En « Standard », l'écran est plafonné à 60 Hz.

### Installer

Télécharger le fichier `.apk` ci-dessous depuis le téléphone, l'ouvrir, autoriser Chrome à
installer des applications inconnues, puis « Installer quand même » sur l'avertissement de
Play Protect. L'avertissement est normal : l'application ne vient pas du Play Store.

### Ce qu'on regarde d'abord

- le **bandeau** suffit-il à voir la semaine d'un coup d'œil, ou faut-il ouvrir un mois ?
- les **marques dans les tranches** sont-elles lisibles à bout de bras ?
- la **phrase sous la date** (« libre de 13 h 30 à 17 h ») dit-elle la bonne chose ?
- la **nuit repliée** : la bande est-elle au bon endroit, ou gêne-t-elle ?
- la **grille horaire** : on la garde, ou on va vers une simple liste d'heures écrites ?

### Ce qu'on mesure

Le compteur en haut à droite affiche la cadence mesurée et le seuil réellement appliqué.
Faites d'abord un geste franc de quelques secondes : tant qu'il dit « calibrage », le
chiffre n'est pas encore fiable, et un relevé préfixé « ≈ » a été pris au repos — il ne
compte pas.

- appui long de 350 ms sur un événement, puis glissé : il doit s'accrocher aux demi-heures
- bouger le doigt **avant** l'appui long : la page doit défiler, pas déplacer le bloc
- appui simple : deux poignées apparaissent pour changer le début et la fin
- appui long sur une zone vide : création par étirement
- pincement à deux doigts : la hauteur des créneaux change, le créneau sous les doigts ne bouge pas
- balayage horizontal sur la page : jour suivant ou précédent (la page suit le doigt)
- balayage horizontal sur le bandeau : semaine suivante ou précédente
- appui sur une bande de nuit : elle se déplie, puis se referme

Le détail et la grille de relevé sont dans `spike/week-grid/README.md`.

### L'équivalent web

La même vue existe en version web, à essayer sur les deux téléphones sans rien installer,
et c'est elle qui sera le client de l'iPhone. Elle a reçu exactement les mêmes corrections.
