# Navbar mobile — bouton flottant et panneau du bas

Navigation mobile d'une **page one-page** (sections ancrées par `id`), placée
tout en bas de l'écran, là où tombe le pouce. Fermée, c'est un bouton flottant
en bas à droite. Ouverte, un panneau monte du bas avec une rangée de pastilles
qui défile horizontalement et suit la section visible.

- **Origine** : portfolio `aadidevv` (Next.js App Router + Tailwind v4 +
  Framer Motion + next-themes). Extrait de `app/components/layout/NavbarMobile_V2.tsx`,
  avec l'état venu de `Navbar.tsx` (hook `useNavState`).
- **Fichier** : `navbar-mobile.tsx` — tout est aplati dedans (suivi de section,
  scroll programmatique, bascules langue/thème, composant). Client component.
- **Plage d'affichage** : < 768 px. Au-dessus, la variante tablette
  (`components/navbar-tablet/`, avec la note sur la sélection du palier en CSS).

## 1. Anatomie

```
Fermée                               Ouverte
                                     ┌──────────────────────────────────┐
                                     │ A.        FR|EN  ☀            ✕  │
                                     │──────────────────────────────────│
                     ┌────┐          │ Projets [À propos] Stack Parco▒▒ │ ← défile, fondu
                     │ ≡  │          └──────────────────────────────────┘
                     └────┘ ← 58×58, verre dépoli, bas droite
```

- **Bouton ≡** : `fixed bottom-6 right-5`, flottant, verre dépoli, ombre portée.
  Le glyphe est le caractère `≡`, pas une icône.
- **Panneau** : bord à bord, coins hauts arrondis, verre dépoli à 85 %.
  Monogramme à gauche, bascules au centre, ✕ à droite, puis un filet et la
  rangée de pastilles.
- **Pastille active** : fond accent, et **un peu plus grande** que les autres.

## 2. Comment ça marche

**Section active et clic** : même mécanique que la tablette (observer sur le
quart supérieur de l'écran, verrou pendant le scroll programmatique jusqu'à
`scrollend`). Voir le README de `navbar-tablet`.

**Le panneau reste ouvert.** Un clic sur une pastille fait défiler la page mais
ne ferme pas le panneau : le `setOpen(false)` est commenté dans l'original. Le
panneau devient alors une barre de progression : à chaque changement de section
active, la pastille correspondante est recentrée dans la rangée
(`scrollIntoView({ inline: "center" })`).

**Fondus de bord.** Deux dégradés posés sur la rangée, affichés seulement s'il
reste du contenu de ce côté (seuil 8 px). Recalculés à chaque `scroll` de la
rangée, et une fois 50 ms après l'ouverture.

**Transition.** Deux `AnimatePresence` indépendants : le bouton ≡ descend et
s'efface pendant que le panneau monte, et inversement.

## 3. Points non évidents, à ne pas casser

| Point | Pourquoi |
|---|---|
| Navigation en bas, pas en haut | Zone du pouce sur téléphone. Le haut de l'écran reste entièrement au contenu. |
| Mesure des fondus à l'ouverture | `onScroll` ne se déclenche pas tant que rien n'a défilé : sans cette mesure, le fondu droit resterait éteint alors que des pastilles sont cachées. |
| Recentrage par index des `<button>` de la rangée | Suppose que la rangée ne contient **que** les pastilles, dans l'ordre de `sections`. Ajouter un autre bouton dedans décale tout. |
| `block: "nearest"` dans le recentrage | Sans lui, `scrollIntoView` ferait aussi défiler **la page** verticalement vers le panneau. |
| Barre de défilement masquée des deux façons | `scrollbarWidth: none` (Firefox) + `[&::-webkit-scrollbar]:hidden` (Chrome/Safari). |
| `overflow: hidden` sur le conteneur des fondus | Les fondus sont en `absolute` : sans lui, ils déborderaient des coins arrondis. |
| Bascule de langue en `<a>`, pas `<Link>` | Changement de root layout (`app/[locale]`) — voir le README tablette. |
| Placeholder de la bascule de thème avant montage | Évite l'erreur d'hydratation (`resolvedTheme` inconnu côté serveur). |

## 4. Câblage côté page (projet d'origine, adapté aux props aplaties)

```tsx
<div className="md:hidden">
  <NavbarMobile
    sections={audience === "recruiter"
      ? ["projects", "about", "skills", "timeline", "contact"]
      : ["projects", "about", "skills", "contact"]}
    labels={dict.nav}
    brand="A."
    lang={{
      current: locale,
      alternateHref: pathInLocale(usePathname(), locale === "fr" ? "en" : "fr"),
      ariaLabel: dict.nav.switchLanguage,
      onSwitch: () => { document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=31536000; samesite=lax`; },
    }}
    showThemeToggle={!THEME_LOCKED_DARK}
  />
</div>
```

Contrairement à la tablette et au desktop, la version mobile **n'affiche pas
de CTA** (« Voir mon CV » / « Travailler ensemble ») ni de bouton vers
l'accueil.

## 5. À adapter dans un nouveau projet

**1. Le comportement à la fermeture.** Décider si le panneau reste ouvert après
un clic (original) ou se ferme (décommenter `setOpen(false)` dans `handleNav`).
Resté ouvert, il masque en permanence le bas de l'écran : bien pour
une page courte, pesant pour une page longue à lire.

**2. L'accessibilité.** L'original n'a pas de gestion clavier : pas de fermeture
par Échap, pas de déplacement du focus dans le panneau à l'ouverture ni de
retour sur ≡ à la fermeture, pas d'`aria-expanded` sur ≡, pas
d'`aria-current` sur la pastille active. Le glyphe `≡` dépend de la police :
une icône `Menu` de lucide serait plus fiable. Les libellés d'accessibilité
étaient en anglais en dur ; ici ils passent par la prop `a11y`.

**3. Le redimensionnement.** Les fondus ne sont recalculés qu'au défilement et
à l'ouverture, pas quand la largeur change (rotation de l'écran). Ajouter un
`ResizeObserver` sur la rangée si ça compte.

**4. Les couleurs en dur.** `#fafaf8` (texte sur accent), bordures
`rgba(147,123,123,0.35)` et `rgba(200,190,180,0.5)`, ombres en `rgba`. À
remplacer par les tokens de la nouvelle DA. Le fondu gauche et le fondu droit
n'ont pas le même dégradé dans l'original (le gauche est plus progressif) ;
les harmoniser au passage.

**5. Les tokens de DA.** Variables CSS utilisées : `--color-bg-primary`,
`--color-bg-tertiary`, `--color-text-primary`, `--color-text-muted`,
`--color-accent`, `--color-border`. Le panneau étant à 85 % d'opacité et le
fondu droit sur `--color-bg-primary` plein, le fondu peut se voir comme une
bande plus claire ou plus sombre selon ce qui défile derrière.

**6. Le contenu caché derrière le bouton.** Le bouton ≡ recouvre le coin bas
droit de la page. Prévoir un espace en bas de la dernière section (ou du footer)
pour qu'aucun lien ne reste inaccessible dessous.

**7. Les dépendances.** `framer-motion`, `lucide-react`, `next-themes` (retirer
la bascule de thème s'il n'y a pas de dark mode). Pas de dépendance à Next.
