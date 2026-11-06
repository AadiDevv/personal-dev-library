# personal-dev-library

## 1. Pourquoi ce projet existe

C'est ma bibliothèque personnelle de solutions, composants et patterns développés au fil de mes différents projets (notamment freelance).

Certains éléments peuvent être très spécifiques à un ancien projet et ne sont **pas forcément génériques ou réutilisables tels quels**. Ce n'est pas une librairie logicielle publiable ni parfaite.

L'objectif est de conserver des **références fonctionnelles et compréhensibles** pour pouvoir les retrouver, les réutiliser et les adapter dans de futurs projets — par moi-même ou par une IA.

## 2. Comment le projet est organisé

```
personal-dev-library/
├── solutions/     # fonctionnalités ou solutions complètes répondant à un besoin précis
│   ├── form-to-whatsapp/
│   ├── form-to-google-sheets/
│   └── ...
├── components/    # composants réutilisables isolés
│   ├── navbar/
│   ├── pricing-table/
│   └── ...
├── patterns/      # architectures, méthodes ou structures réutilisables
│   ├── responsive-dashboard/
│   ├── auth-flow/
│   └── ...
└── README.md
```

Chaque élément peut contenir son code original tel qu'il a été utilisé, accompagné idéalement d'un petit `README.md` expliquant :
- ce que ça fait ;
- dans quel contexte c'était utilisé ;
- comment ça fonctionne globalement ;
- ce qui devra probablement être adapté dans un futur projet.

## 3. Comment utiliser ce repo
### Intégration des éléments

Chaque solution, composant ou pattern doit être intégré **dans son intégralité sur une seule page/fichier**.

Si l'implémentation originale est découpée en plusieurs composants, sous-composants ou fichiers, l'ensemble doit être aplati lors de son intégration dans la bibliothèque : tout le code nécessaire doit être regroupé dans un seul fichier (par exemple un `.tsx`).

L'objectif est que chaque élément de la bibliothèque soit autonome et immédiatement lisible par une IA, sans avoir à naviguer entre plusieurs fichiers pour comprendre son fonctionnement.

- Reprendre le code existant et l'adapter au nouveau projet, dans les fonctionnalité et autres. Penser à adapter à la DA du nouveau projet, donc être force de proposition sur ce point
- Ne pas supposer que le code est directement plug-and-play : identifier ce qui dépendait de l'ancien projet (framework, dépendances, données, API, styles, etc.) avant de l'intégrer ailleurs.

## 4. Comment ajouter de nouvelles ressources

- Quand une nouvelle solution, un composant ou un pattern intéressant est créé dans un projet, il peut être ajouté ici dans le dossier correspondant.
- Garder le code proche de sa version fonctionnelle originale, pour qu'il reste une référence fiable.
- Ajouter un petit `README.md` dans le dossier quand cela apporte du contexte utile.

### Une ressource en plusieurs variantes : un seul code, une prop `variante`

Quand une solution ou un composant a été conçu en plusieurs variantes (pistes
comparées en maquette avec le client), on les range **toutes dans le même
code**, choisies par une seule prop (`variante="…"`), et non un dossier par
variante. Sept dossiers presque identiques divergent au premier correctif ; un
seul code se corrige une fois pour toutes les variantes.

- **Ce qui est commun reste commun** : logique, état, formulaire, accessibilité.
  Seul ce qui change d'une variante à l'autre devient un petit adaptateur
  interne, rangé dans une table (`Record<Variante, …>`). Ajouter une variante =
  ajouter une entrée.
- **L'interface reste courte** : la variante, plus les quelques entrées dont
  l'appelant a vraiment besoin, avec des valeurs par défaut pour le reste.
- **Le README du dossier compare les variantes** : ce qu'on voit, ce que ça
  apporte, ce que ça coûte, laquelle a été retenue en production et pourquoi
  (avec les mots du client), et comment choisir sur un nouveau projet. C'est ce
  qui évite de refaire tout le cycle de maquettes à chaque projet.
- **Vérifier chaque variante au rendu** avant de l'intégrer ici, même celles qui
  n'ont jamais été en production, et le dire dans le README.
- À intégrer **depuis la session qui vient de coder la ressource** : elle a
  encore en tête les pistes écartées et les pièges, qu'une session fraîche
  devrait reconstituer.

Exemples : `solutions/retours-visiteurs/` (neuf variantes de point d'entrée),
`components/apercu-cours/` (deux variantes).
