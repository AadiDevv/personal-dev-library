# Aperçu d'un cours — filet ou bande

Section de page d'accueil qui présente **un cours et les livres qu'il étudie**,
pour amener le visiteur jusqu'à la fiche du cours. Deux variantes complètes dans
le même fichier : `filet` (retenue en production) et `bande`.

- **Origine** : `MEDINE_INSTITUT` (Next.js App Router + Payload CMS + Tailwind v4),
  section « Aperçu d'un cours » de l'accueil. Extrait de
  `components/sections/SectionApercuCours.tsx`, `components/ui/PlaqueOuvrage.tsx`,
  `components/ui/Motif.tsx`, `components/ui/Button.tsx`,
  `components/ui/SectionHeading.tsx`, `lib/tons.ts`.
- **Fichier** : `apercu-cours.tsx` — tout est aplati dedans (cx, icône, trame,
  carte de livre, bouton, types, libellés). Server component, sans état.
- **Seul le filet a tourné en production.** La bande a été validée en maquette
  puis portée ici en Tailwind et vérifiée au rendu (bureau et mobile), mais jamais
  déployée.

## 1. Le problème que ça résout

Montrer un contenu **réel** de l'offre sur l'accueil, pas une promesse. Pour un
institut d'enseignement, un livre classique identifiable (« Les Trois
Fondements ») prouve le sérieux mieux qu'un intitulé de cours que n'importe qui
pourrait écrire.

La difficulté est de faire comprendre **d'un coup d'œil** que le livre est
étudié *dans* un cours proposé par le site. Voici ce qui a été écarté en chemin
(maquettes comparées avec le client) :

| Version | Pourquoi écartée |
|---|---|
| Livre en grand titre, cours en petit à côté | L'accroche est forte, mais la relation livre → cours repose sur une étiquette grise. On ne voit pas que c'est un cours. |
| Livre dans un bandeau sombre, carte du cours reliée dessous par « ↓ étudié dans le cours » | Superbe en bureau, mais les deux blocs s'empilent lourdement en mobile, et la relation se lit au lieu de se voir. |
| Grande carte du cours contenant les cartes des livres | La relation est enfin évidente, mais **deux niveaux de cartes imbriqués** : motif rejeté, typique des interfaces générées. |

Version retenue : **le cours est le titre, les livres sont les seules cartes**.
Il fallait donc remplacer ce que faisait la carte englobante (regrouper le cours
et ses livres, et les détacher du fond) par quelque chose de plus léger. D'où les
deux variantes.

## 2. Filet ou bande : l'arbitrage

| | `filet` | `bande` |
|---|---|---|
| Ce qui regroupe | Un trait entre le cours et ses livres (vertical en bureau, horizontal en mobile) | Une bande bord à bord, translucide (`bg-bg-primary/60`) et floutée (`backdrop-blur-md`) |
| Lisibilité | Voile de la couleur de la bande à 55 % sur **toute** la section | La bande ; le fond reste nu autour d'elle |
| Fond de section | Discret partout | **Plus présent** au-dessus et au-dessous de la bande |
| Alternance avec les sections voisines | Plus douce | **Plus marquée** : le fond ressort aux extrémités et casse franchement la suite des bandes unies |
| Coût | Aucun | `backdrop-filter` sur une image plein fond peut ralentir le défilement sur des téléphones modestes — à vérifier sur appareil réel |
| Registre | Éditorial, très léger | Plus « objet », plus spectaculaire |

Le client a hésité et retenu le **filet**. Il a noté l'avantage de la bande sur
l'alternance : c'est le critère à reprendre si, sur un autre projet, la section
se noie parmi des bandes de même couleur.

## 3. Points non évidents, à ne pas casser

| Point | Pourquoi |
|---|---|
| Un seul niveau de carte | Les livres sont des cartes, le cours jamais. Ne pas « harmoniser » en encadrant le cours. |
| Couverture en `mix-blend-multiply` | Une photo de livre détourée sur fond blanc voit ce blanc prendre la couleur de la carte, sans retouche ni cadre blanc. **La carte doit rester opaque** : posé sur la bande translucide, le multiply se composerait avec l'image de fond. |
| Trame à la place d'une couverture absente | Un aplat vide lit comme un bug de chargement, une trame comme une intention. Masque CSS répété (taille de cellule stable), couleur par `text-*` du parent. |
| Image de fond à 50 %, jamais pleine | Demande explicite du client. Choisir une photo **claire** : une image sombre (essai : désert de nuit) donne une bouillie brune à 40 % et, plus forte, transforme la section en bande sombre. |
| Filet décalé de `-mr-8` + `pr-8` | Le trait tombe au milieu de la gouttière de 64 px au lieu de coller aux cartes. |
| `min-w-0` sur les colonnes et les `<li>` | Sans lui, un titre long garde sa largeur `min-content` et fait déborder la page en mobile. |
| Le libellé « Cours » en accent, les repères en gris | C'est ce libellé qui répond à « est-ce un cours ? ». Le « Gratuit » repasse en accent : c'est un argument. Le payant ne s'annonce pas. |
| Pas de lien « catalogue complet » | Dans le projet d'origine, aucune page de ce nom : l'offre est découpée par domaine. Un CTA vers une page inexistante ou vers un domaine qui ne contient que ce cours serait une fausse promesse. Un seul CTA, vers la fiche. |
| Contenu volontairement court | Programme, professeurs, niveau détaillé, prix : sur la fiche. Une version avec cartes professeurs et paragraphe d'adaptation au niveau a été jugée trop lourde (« cet écran, c'est juste pour rediriger »). |

## 4. Câblage côté page (projet d'origine)

```tsx
// Payload : global « section-apercu-cours » (module vedette + imageFond), depth 2
// pour peupler la matière du module et la couverture de chaque ouvrage.
const data = await payload.findGlobal({ slug: "section-apercu-cours", locale, depth: 2 });
const module = data.module; // objet peuplé
const image = (m) => m?.url ? { src: m.url, width: m.width, height: m.height, alt: m.alt } : null;

<ApercuCours
  variante="filet"
  ton={tons.apercuCours}                 // alternance page / sable calculée par la page
  imageFond={image(data.imageFond)}
  cours={{
    titre: module.titre,
    href: `/${lang}/cours/${module.slug}`,
    accroche: module.accroche,
    reperes: [module.matiere.nom, dict.niveau[module.niveau]],
    gratuit: module.visibilite === "gratuit",
    ouvrages: module.ouvrages.map((o) => ({
      id: o.id, titre: o.titre, precision: o.precision, couverture: image(o.couverture),
    })),
  }}
/>
```

Place dans le parcours de l'accueil (argumentée avec le client) : juste **après**
la vue d'ensemble de l'offre (« Découvrir nos programmes ») et **avant** la
présentation de l'institut et la réassurance. Le visiteur a d'abord compris ce
qui est proposé, puis on lui montre un exemple concret.

## 5. À adapter dans un nouveau projet

**1. Le vocabulaire métier.** « Cours » / « Textes étudiés » pour un institut.
Ailleurs : une formation et ses modules, un menu et ses plats signature, un
produit et ses matériaux… Le schéma est générique : **un contenant en titre, ses
éléments reconnaissables en cartes**.

**2. Les libellés** — objet `LABELS_FR`, passable en prop `labels`.

**3. Les tokens de DA.** Exclusivement des tokens sémantiques Tailwind v4, à
remapper :

`bg-bg-primary` · `bg-bg-secondary` · `bg-bg-raised` · `text-text-primary` ·
`text-text-muted` · `border-border-subtle` · `bg-accent` / `hover:bg-accent-hover` /
`text-accent-foreground` / `text-accent` · `font-display` · `font-mono` ·
`rounded-sm` / `rounded-lg`.

Si le nouveau projet n'a pas ce système, proposer les équivalents de sa DA plutôt
que des couleurs Tailwind brutes.

**4. L'image de fond et le motif.** Le motif rub' al-hizb est propre à l'univers
d'origine : à remplacer par un motif de la nouvelle DA (ou un aplat texturé).

**5. Les dépendances.** `next/image` (avec `fill` pour le fond : le parent est
en `absolute inset-0`) et `next/link`. Hors Next, `<img>` et `<a>`. Les URL
d'images doivent être autorisées par la config `images` du projet.
