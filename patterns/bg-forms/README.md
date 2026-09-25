# Background forms — formes de fond qui mettent le texte en avant

Formes vectorielles décoratives posées **derrière** un titre, une image, un
chiffre ou un mot, pour le faire ressortir sans dégradé de lisibilité générique.

- **Origine** : `MEDINE_INSTITUT` (Next.js App Router + Payload CMS + Tailwind v4)
  pour les trois voiles (exports Figma, repris dans `components/ui/VoileCarres.tsx`
  et `components/sections/SectionPourQui.tsx`) ; un lot de formes génériques
  (hors maquette) pour le reste, dont seule la géométrie a été gardée.
- **Fichiers** : un fichier par rôle, autonome et aplati (`cx` et wrapper
  interne dupliqués dans chacun, c'est voulu). Chaque fichier porte en en-tête
  `@echelle`, `@role`, `@preview`, et « Comment l'utiliser » ; chaque composant
  porte `@forme`. Les exemples de pose (empilement) sont dans le fichier du rôle.
- **Ce qui est réutilisable** : moins les formes elles-mêmes que **la méthode** —
  comment les intégrer sans qu'elles cassent. C'est pourquoi cette entrée est un
  *pattern* et pas un composant.

## 1. Philosophie : échelle › rôle › forme

On choisit une forme décorative d'abord par **échelle**, puis par **rôle** (ce
qu'elle fait pour le contenu) ; la **forme** visuelle n'est qu'un tag.
- **Macro** : travaille toute la section. **Méso** : sert un élément précis
  (titre, image, chiffre). **Micro** : ponctue un mot.
- Un dossier par échelle, un fichier par rôle. Chercher « à quoi ça sert » avant
  « à quoi ça ressemble ».

## 2. Catalogue

| Échelle | Rôle | Fichier | Composants | Formes | Preview |
|---|---|---|---|---|---|
| macro | Casser un aplat | `macro/casser-aplat.tsx` | `VaguePleine` · `VagueDoublee` · `BiaisPaliers` · `TriangleAngle` · `Nappes` · `GaletsEmpiles` · `BullesCoin` · `Facettes` · `PlansInclines` · `LosangesEpars` · `GaletDisques` · `Dunes` · `ArchesDecalees` · `VoileBiseau` · `CoinQuart` | organique · géométrique · radial · arrondi · mixte | [voir](https://claude.ai/artifact/FDtmxHBtV4Hbz1eJ1VsUq6) |
| macro | Raccorder deux sections | `macro/raccorder-sections.tsx` | `VoileFuseau` · `BordCourbe` · `BordVague` · `BordBiais` · `BordArc` | organique · géométrique · arrondi | [voir](https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY) |
| macro | Créer un point focal | `macro/point-focal.tsx` | `HaloSimple` · `HaloDuo` · `HaloTrio` | flou | [voir](https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY) |
| macro | Rythmer une section | `macro/rythmer-section.tsx` | `TraceContours` · `CoinArcs` | organique · radial | [voir](https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY) |
| macro | Donner de la matière | `macro/matiere.tsx` | `TexturePoints` · `TextureGrille` · `TextureHachures` · `TextureGrain` | texture | [voir](https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY) |
| méso | Fond de lecture d'un titre | `meso/fond-de-lecture.tsx` | `VoileCarres` | géométrique | [voir](https://claude.ai/artifact/MrZ8k34NkjTGkqLMBZQ3hB) |
| méso | Guider l'œil | `meso/guider-oeil.tsx` | `TraceFlux` · `TraceArcs` | linéaire · radial | [voir](https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY) |
| méso | Ancrer un chiffre | `meso/ancrer-chiffre.tsx` | `AnneauConcentrique` · `AnneauProgression` · `AnneauPointille` | radial | [voir](https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY) |
| méso | Habiller une image | `meso/habiller-image.tsx` | `CadreImage` (arche · coin · galet · pilule) | arrondi | [voir](https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY) |
| micro | Souligner un mot | `micro/souligner.tsx` | `AccentSouligne` · `AccentTrait` · `AccentEntourage` · `AccentEtincelle` · `AccentFleche` | linéaire · géométrique | [voir](https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY) |

Les JSDoc rappellent le nom kebab d'origine (`macro-edge-curve`…) pour la
correspondance avec la doc Notion. Deux formes rangées selon leur usage réel
plutôt que leur famille d'origine : `CoinQuart` (casser un aplat) et `CoinArcs`
(rythmer une section) venaient des anneaux, mais ce sont des formes de coin de
section, pas des socles de chiffre. `AccentFleche` désigne plus qu'elle ne
souligne : rangée en micro pour son échelle.

**Opacité**, toujours dans la classe (`text-x/[0.15]`, `opacity-40`) :
0.05 à peine perçu · 0.15 discret · 0.4 présent · 0.7 affirmé. Les compositions
de `casser-aplat` ont leur propre réglage : la variable `--i` (défaut 0.12).

## 3. Variables à remapper

Les formes monochromes suivent `currentColor` (`text-<token>`). Les formes
multi-tons (`VoileFuseau`, `HaloDuo`, `HaloTrio`) lisent trois variables, à
déclarer dans le thème du projet — **non définies, elles rendent du noir** :

```css
:root {
  /* Médine Institut */
  --shape-primary: var(--bg-institut);        /* forme dominante, bas du fuseau */
  --shape-accent:  var(--bg-institut-voile);  /* tracés, halos, palier du fuseau */
  --shape-neutral: var(--bg-primary);         /* fonds doux, haut du fuseau */

  /* Réglages optionnels (défauts dans le code) */
  --shape-stroke: 1.5;  /* épaisseur des traits, px écran */
  --shape-blur: 56px;   /* flou des halos */
}
```

Dans un projet sans tokens équivalents, partir des gris Tailwind v4
(`var(--color-gray-800)` / `-500` / `-200`) plutôt que d'écrire des hex.

## 4. Pièges

| Piège | Pourquoi / quoi faire |
|---|---|
| Charger une forme via `<img>` ou `background-image` | Les variables CSS et `currentColor` n'y sont pas transmises : la forme sort noire ou figée. Toujours le composant inline. |
| `var()` dans un attribut SVG (`fill="var(--x)"`, `stopColor="var(--x)"`) | Pas fiable selon les navigateurs. Passer par `style={{ fill: "var(--x)" }}`. |
| Oublier `overflow-hidden` sur le parent | Compositions, halos (flou), biseau, coins et textures débordent et créent un défilement horizontal. |
| Empilement | Section `isolate`, formes de fond en `-z-10` (au-dessus du fond de la section, sous le contenu). Plusieurs formes au même z-index : l'ordre du DOM décide. Ne pas donner `relative z-0` à un bloc voisin « pour clarifier » : il enferme ses enfants sous la forme (voir l'exemple de `meso/fond-de-lecture.tsx`). |
| Régler le flou d'un halo avec `blur-*` | Conflit avec la classe de la forme : passer par `--shape-blur`. |
| Teinter `TextureGrain`, `HaloDuo`, `HaloTrio` avec `text-*` | Sans effet : doser avec `opacity-*`. |
| Texture sans `fade` | Effet papier peint, bords durs. `fade="radial"` par défaut. |
| Bord de section avec un liseré | Arrondi sous-pixel : `-bottom-px` au lieu de `bottom-0`. |
| Traits rognés aux extrémités | Les `viewBox` sont recadrées sur la géométrie ; les formes en trait portent `overflow-visible`. Ne pas le retirer. |
| `id` statique dans un `<defs>` | Deux instances partageraient le même dégradé ou motif. Toujours `useId` (voir `useIdSvg` dans les fichiers concernés). |

# Annexe — les voiles de Médine et la méthode d'intégration

## 5. Le problème que ça résout

Un titre posé sur une photo est illisible. Le réflexe est un dégradé sombre ou un
voile uni sur toute la section : ça marche, mais ça salit la photo, et c'est
difficile à adapter d'un écran à l'autre (« ça faisait sale et c'était dur à
adapter » — retour du projet d'origine, qui a supprimé son dégradé).

Une forme géométrique translucide, **ancrée sur le bloc de texte**, règle les deux
problèmes : la photo reste nue partout ailleurs, et la lisibilité est portée par
l'objet qui entoure le texte, pas par toute la section.

## 6. Les trois formes utilisées

| Forme | Fichier source | Rôle | Particularité |
|---|---|---|---|
| Carrés inclinés | `group-square-forms.svg` | Fond de lecture d'un titre sur photo (hero) | 3 `rect` à -25°, opacités 0.45 / 0.4 / 0.7 ; teinte par `currentColor` |
| Fuseau | `Ellipse-header-pourqui.svg` | Raccord entre deux zones (photo → aplat vert) | Dégradé **strictement vertical**, `preserveAspectRatio="none"` |
| Biseau | `Ellipse-sectionPourqui.svg` | Casse un aplat uni derrière une liste | 7 % d'opacité, déborde volontairement à gauche |

Elles vivent désormais dans leur fichier de rôle : `VoileCarres` →
`meso/fond-de-lecture.tsx`, `VoileFuseau` → `macro/raccorder-sections.tsx`,
`VoileBiseau` → `macro/casser-aplat.tsx`. Les trois viennent de Figma. Les SVG bruts ne sont **pas** utilisés tels quels :
chacun est inliné et retouché (voir §7).

## 7. Méthode d'intégration — les règles qui évitent les bugs

| Règle | Pourquoi |
|---|---|
| SVG **inliné**, pas `background-image` | La couleur passe par `currentColor` / `var(--token)` : une couleur = un token, zéro hex dans le composant. Un `background-image` figerait la couleur du fichier. |
| Supprimer les couleurs en dur de l'export | Figma exporte `#D9D9D9`, `#B3B3B3`, `#255042`… Les remplacer par `currentColor` (forme) ou `var(--…)` (stops de dégradé). Garder l'**opacité** de l'export si elle fait partie du dessin. |
| **Recadrer la `viewBox`** sur la boîte réelle des formes | L'export laisse des marges vides (~8 % ici). Sans recadrage, ancrer la pointe d'une forme sur le bord d'une bande demande de compenser à la main, et toute réexportation casse le calage. Recadrée, la boîte de l'élément *est* celle de la forme : `bottom-0` suffit. |
| Distinguer repère du fichier et repère de la maquette | Figma applique une transformation (`matrix(...)`, homothétie) au placement. Le fuseau est dessiné dans son repère *post-transformation* ; le biseau garde celui du fichier. Reporter la matrice **en commentaire** du composant. |
| `preserveAspectRatio="none"` seulement si le dégradé est vertical | L'étirement horizontal ne le déforme alors pas. Avec un dégradé oblique ou radial, ça le déformerait : garder le ratio. |
| `aria-hidden` + `pointer-events-none` | Décoratif, jamais cliquable : sinon il masque les liens qu'il recouvre. |
| Empilement explicite | Section `isolate`, photo `-z-10`, forme `z-10`, texte `z-20`. Ne pas donner `relative z-0` à un bloc voisin « pour clarifier » : il enferme ses enfants dans un contexte d'empilement et ils repassent sous la forme. |
| **Mesurer le contraste** | Surtout sur un dégradé : le texte change de fond selon sa hauteur. À refaire à chaque retouche du tracé, des stops ou de la taille. |
| Le SVG source reste la référence | Le composant reprend les coordonnées à l'identique. On modifie le fichier Figma puis on reporte, pas l'inverse. |

## 8. L'IA peut-elle créer ces formes elle-même ?

Oui, et c'est un usage raisonnable — avec une limite et une condition.

**Ce qui marche bien** : un SVG est du texte. Formes géométriques (rectangles
tournés, ellipses, polygones, bandes), blobs simples en courbes de Bézier,
dégradés, masques, motifs répétés — l'IA les écrit directement, avec `viewBox`
recadrée et couleurs en tokens, ce qui évite justement les retouches de la §7.
C'est même plus propre qu'un export Figma (pas de marge parasite, pas de hex).

**La limite** : les tracés organiques complexes. Les trois formes ci-dessus ont
été dessinées à la main dans Figma ; la courbe du fuseau ou du biseau est un
choix d'œil, pas une règle. Une IA produit une courbe *correcte*, rarement une
courbe *belle* du premier coup.

**La condition** : sans retour visuel, la forme sort à l'aveugle. La boucle qui
marche : écrire le SVG → le **rendre** (navigateur ou export PNG) → le regarder
→ corriger. Sans cette boucle, prévoir de fournir une maquette ou un export
Figma et de laisser l'IA appliquer la §7.

### Brief à donner pour faire créer une forme

À fournir dans le prompt, c'est ce qui rend le résultat exploitable :

1. **Le rôle** : fond de lecture d'un titre ? raccord entre deux zones ? relief
   sur un aplat ? (→ ça décide de l'opacité et de la géométrie.)
2. **Ce qu'il y a derrière** : photo claire / sombre / aplat de tel token.
3. **Ce qu'il y a dessus** : un titre de N lignes, un bloc centré ou ferré à
   gauche — la forme doit englober le texte, pas l'inverse.
4. **L'ancrage** : bord de bande, bas de section, centré… (→ décide de la
   `viewBox` recadrée.)
5. **Le token de teinte** : jamais un hex.
6. **La famille de formes** : à reprendre de ce dossier (carrés, fuseau, biseau)
   pour rester cohérent d'un site à l'autre, ou nouvelle famille assumée.

Et la **contrainte de vérification** : contraste mesuré sur le texte final, en
bureau et en mobile.

## 9. À adapter dans un nouveau projet

**1. Choisir : réutiliser ou créer.** Les trois formes sont bien adaptées aux
sites vitrine à hero photo + bandes de couleur. Un autre univers (angulaire,
organique, très minimal) demande une autre famille : la méthode §7 reste valable,
les tracés non.

**2. Les tokens.** `text-bg-primary` (teinte des carrés), `text-on-media/[0.07]`
(biseau), et les variables `--shape-primary`, `--shape-accent`, `--shape-neutral`
(dégradé du fuseau, remappées dans Médine sur `--bg-institut`,
`--bg-institut-voile`, `--bg-primary` — voir §3). À remapper sur la DA du projet ;
si elle n'a pas ce système, proposer des équivalents plutôt que des hex.

**3. Les tailles.** Les largeurs (`w-[37rem]`, `lg:w-[46rem]`, `h-80`…) sont
calées sur le contenu du projet d'origine : à retrouver au rendu, pas à copier.

**4. Les dépendances.** Aucune : SVG inline + Tailwind. `cx` est inliné.

**5. Le thème sombre.** Passer par `currentColor` fait suivre le thème sans
classe `dark:` — mais le projet d'origine n'a pas de thème sombre, donc ce
comportement n'y a jamais été vérifié.
