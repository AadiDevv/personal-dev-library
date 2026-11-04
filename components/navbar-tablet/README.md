# Navbar tablette — barre haute rétractable à languette

Barre de navigation fixe en haut d'une **page one-page** (sections ancrées par
`id`) : pastilles de section qui suivent le défilement, bascule FR/EN, bascule
de thème, un CTA. Elle **se range vers le haut** et une petite languette accent
reste toujours visible pour la faire redescendre.

- **Origine** : portfolio `aadidevv` (Next.js App Router + Tailwind v4 +
  Framer Motion + next-themes). Extrait de `app/components/layout/NavbarTablet.tsx`,
  avec l'état venu de `Navbar.tsx` (hook `useNavState`) et les bascules de
  `NavControls.tsx`.
- **Fichier** : `navbar-tablet.tsx` — tout est aplati dedans (suivi de section,
  scroll programmatique, bascules langue/thème, composant, CSS du CTA en
  commentaire). Client component.
- **Plage d'affichage** : tablette, 768 → 1536 px. En dessous, la variante
  mobile (`components/navbar-mobile/`) ; au-dessus, une sidebar desktop.

## 1. Anatomie

```
┌─────────────────────────────────────────────────────────────────────┐
│ (⌂)  Projets  [À propos]  Stack  Parcours  Contact     FR|EN ☀ [CV] │  ← 80 px, verre dépoli
└───────────────────────────────┬───┬─────────────────────────────────┘
                                │ ^ │  ← languette accent 52×18, toujours visible
                                └───┘
```

- **⌂** : petit cercle à l'écart des pastilles, vers la section d'accueil
  (`hero`). Il n'est pas dans la liste des sections : c'est un « retour en
  haut », pas une étape du parcours.
- **Pastille active** : fond accent plein ; les autres sont du texte seul.
- **Languette** : collée sous la barre quand elle est ouverte, seule au bord
  haut de l'écran quand elle est rangée. Le chevron pivote de 180°.

## 2. Comment ça marche

**Section active.** Un `IntersectionObserver` sur toutes les `section[id]`, avec
`rootMargin: "0px 0px -75% 0px"` : la zone de détection est le **quart
supérieur** de l'écran. Une section devient active quand son haut y entre.

**Clic sur une pastille.** `scrollTo(id)` marque la section active tout de
suite, lance un `scrollIntoView` doux et **verrouille l'observer** jusqu'à
l'événement `scrollend` (repli : timer d'1 s). Sans ce verrou, la pastille
active défilerait par toutes les sections traversées pendant l'animation.

**Rangement.** La barre et la languette sont deux éléments `fixed` animés par
translation (`y`) avec la même durée et la même courbe, ce qui les fait glisser
ensemble. La barre n'est jamais démontée.

## 3. Points non évidents, à ne pas casser

| Point | Pourquoi |
|---|---|
| Spacer de 80 px avant la barre | La barre est `fixed` : sans lui, le haut de la page passe dessous. Il **reste** quand la barre est rangée, pour que le contenu ne saute pas. Contrepartie : tout en haut de page, une bande vide de 80 px apparaît barre rangée. |
| Languette hors de la barre, en `z-50` | Si elle était dans le `<header>`, elle partirait avec lui hors écran. Elle vit à part et suit la barre par sa propre animation. |
| Même `EASE` et même durée (0,4 s) pour barre et languette | Sinon elles se décollent pendant l'animation. |
| Verrou de l'observer pendant le scroll programmatique | Voir §2. Ne pas le retirer « pour simplifier ». |
| Observer reconstruit quand `sections` change | Dans l'original, la liste changeait selon l'audience (recruteur : avec « Parcours » ; client : sans). |
| Bascule de langue en `<a>`, pas `<Link>` | Le root layout vivait sous `app/[locale]` : changer de langue change `<html lang>` et remonte le ThemeProvider. Une navigation client laissait `lang` incertain et un warning sur le script anti-FOUC de next-themes. |
| Placeholder de la bascule de thème avant montage | `resolvedTheme` est inconnu côté serveur : rendre l'icône directement provoque une erreur d'hydratation. |
| CTA à double comportement | `href` en `#id` → scroll doux (dans l'original, « Travailler ensemble » → `#contact` côté client) ; sinon vrai lien dans un nouvel onglet (« Voir mon CV » → PDF côté recruteur). |

### Sélection du palier (côté parent)

Dans l'original, les trois variantes sont rendues en même temps et c'est le CSS
qui choisit laquelle est visible — la nav est ainsi présente dans le HTML servi,
sans `useLayout()` qui retournait `null` au premier rendu.

```tsx
<div className="md:hidden"><NavbarMobile … /></div>
<div className="hidden md:max-lg:block"><NavbarTablet … /></div>
<div className="hidden lg:block"><NavbarDesktop … /></div>
```

⚠ `md:max-lg:block` et **non** `md:block lg:hidden`. Le projet redéfinissait
`--breakpoint-lg: 1536px` (en px, les autres paliers en rem) : Tailwind ne sait
plus les trier et émet `lg:` **avant** `md:`. `md:block` gagnait alors au-delà
de 1536 px et la barre tablette restait affichée par-dessus la sidebar.
`md:max-lg:` compile en une seule condition, sans recouvrement possible.

## 4. Câblage côté page (projet d'origine, adapté aux props aplaties)

```tsx
<NavbarTablet
  sections={audience === "recruiter"
    ? ["projects", "about", "skills", "timeline", "contact"]
    : ["projects", "about", "skills", "contact"]}
  labels={dict.nav}                        // { projects: "Projets", about: "À propos", … }
  cta={audience === "recruiter"
    ? { label: dict.nav.hireMeRecruiter, href: "/Cv_SatyalAaditya_.pdf" }
    : { label: dict.nav.hireMeClient, href: "#contact" }}
  lang={{
    current: locale,
    alternateHref: pathInLocale(usePathname(), locale === "fr" ? "en" : "fr"),
    ariaLabel: dict.nav.switchLanguage,
    onSwitch: () => { document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=31536000; samesite=lax`; },
  }}
  showThemeToggle={!THEME_LOCKED_DARK}    // le site était verrouillé en dark
/>
```

`pathInLocale` traduisait aussi le slug d'audience (`/fr/developpeur/horas` →
`/en/developer/horas`) : c'est pour ça qu'on passe une URL toute faite plutôt
que de remplacer le segment de langue dans le composant.

## 5. À adapter dans un nouveau projet

**1. Les couleurs en dur.** L'original mélange tokens et valeurs brutes
(`#fafaf8` pour le texte sur accent, `rgba(…)` d'ombres et de bordure,
`text-white` sur la languette). À remplacer par les tokens de la nouvelle DA —
typiquement un `text-accent-foreground` pour le texte sur accent.

**2. Les tokens de DA.** Variables CSS utilisées : `--color-bg-primary`,
`--color-bg-tertiary`, `--color-text-primary`, `--color-text-muted`,
`--color-accent` ; classes `bg-bg-primary`, `text-text-primary`. La bordure
basse `rgba(0,0,0,0.06)` est quasi invisible sur fond sombre : à revoir si le
nouveau site est en dark.

**3. Le CTA.** `.btn-titanium` est une classe globale (recopiée en bas du
fichier). Elle est très typée ; lui préférer le bouton principal du nouveau
projet.

**4. L'accessibilité.** À ajouter si on reprend : `aria-current="true"` sur la
pastille active, un `aria-label` sur le bouton ⌂ (il n'en a pas), et
`aria-expanded` sur la languette. Les libellés d'accessibilité étaient en
anglais en dur dans l'original ; ici ils passent par la prop `a11y`.

**5. La marge supérieure des sections.** Le `scrollIntoView` amène le haut de la
section en haut de l'écran, donc **sous** la barre ouverte. Si le titre de
section est collé à son bord haut, ajouter `scroll-margin-top: 80px` aux
sections (l'original s'en passait grâce à de gros `py-40`).

**6. Les dépendances.** `framer-motion`, `lucide-react`, `next-themes` (retirer
la bascule de thème s'il n'y a pas de dark mode). Rien de spécifique à Next
hormis ça : fonctionne dans n'importe quel React.

**7. La largeur.** Rien ne gère le débordement : les pastilles sont en
`nowrap` et ne passent pas à la ligne. L'original avait au plus 5 sections à
libellés courts. Avec plus de sections ou des libellés longs, vérifier à
768 px et prévoir un défilement horizontal de la `<nav>` (comme en mobile) ou
relever le palier.
