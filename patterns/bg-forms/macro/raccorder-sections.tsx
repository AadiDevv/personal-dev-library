/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MACRO › RACCORDER DEUX SECTIONS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @echelle macro
 * @role    raccorder-sections
 * @preview https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY
 *
 * Formes qui font la transition entre deux zones de couleurs différentes, au
 * lieu d'une coupure horizontale nette. Deux familles :
 * - `VoileFuseau` (Médine) : un **dégradé** multi-tons, le texte de l'en-tête
 *   vit dans la zone de fondu (photo → aplat) ;
 * - les bords (`BordCourbe`…) : un **aplat net** de la couleur de la section
 *   suivante, qui « mord » sur la section courante.
 *
 * Invariants de ce fichier :
 * 1. Étirés en `preserveAspectRatio="none"` : la hauteur se règle librement
 *    par classe, la largeur suit la section.
 * 2. Bords : `currentColor` → `text-<token>` de la section **suivante**.
 * 3. Fuseau : multi-tons, lit trois variables à déclarer dans le thème —
 *    non définies, il rend du noir :
 *      --shape-primary: var(--bg-institut);        (Médine) bas du fuseau
 *      --shape-accent:  var(--bg-institut-voile);  (Médine) palier
 *      --shape-neutral: var(--bg-primary);         (Médine) haut du fuseau
 *    Sans tokens équivalents : `var(--color-gray-800)` / `-500` / `-200`.
 *
 * **Comment l'utiliser**
 * 1. Bord : dans la section A (`relative`), en `absolute inset-x-0 -bottom-px
 *    w-full`, hauteur `h-12` à `h-24`. `-bottom-px` masque le liseré
 *    sous-pixel ; `pb-*` réserve la place du contenu.
 * 2. Fuseau : dans un wrapper `relative` qui contient aussi le texte de
 *    l'en-tête (voir sa JSDoc).
 *
 * @example
 * <section className="relative bg-bg-primary pb-24">
 *   …contenu…
 *   <BordCourbe className="absolute inset-x-0 -bottom-px h-16 w-full text-bg-inverse" />
 * </section>
 */

import { useId, type ReactNode } from "react";

/* ══ Utilitaires inlinés ═══════════════════════════════════════════════════ */

/** Concatène des classes en ignorant les valeurs falsy (mini-`clsx`). */
function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * `id` unique par instance pour les `<defs>` : deux fois la même forme sur
 * une page, sans collision. `useId` renvoie des `:` que `url(#…)` n'accepte
 * pas, d'où le nettoyage.
 */
function useIdSvg(prefixe: string): string {
  return prefixe + useId().replace(/[^a-zA-Z0-9]/g, "");
}

/** Invariants communs des bords : SVG inline, décoratif, repère 1440×120 étiré. */
function Bord({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1440 120"
      preserveAspectRatio="none"
      fill="currentColor"
      className={cx("pointer-events-none select-none", className)}
    >
      {children}
    </svg>
  );
}

type Props = { className?: string };

/* ══ Voile en fuseau — raccord photo → aplat (Médine) ══════════════════════ */

/**
 * Fuseau à dégradé **strictement vertical**, étiré sur toute la largeur.
 *
 * `preserveAspectRatio="none"` est un choix : le dégradé étant vertical,
 * l'étirement horizontal ne le déforme pas, il ne change que l'inclinaison de
 * la courbe. En échange, le fondu atteint la couleur pleine à la même hauteur
 * quelle que soit la largeur d'écran (un `slice` recadrerait).
 *
 * Le tracé est celui de l'export Figma **après** la transformation appliquée
 * par la maquette (`matrix(2.2341, 0.8235, 0.8236, 4.5011, -1165.3, 272.49)` :
 * rotation ~20° + étirement) — la `viewBox` reprend le repère de la maquette
 * (origine sur la ligne de raccord, y = 1375). Le fichier SVG brut, lui, est
 * dans son repère d'origine : ne pas confondre les deux jeux de coordonnées.
 *
 * Les trois `stop` du dégradé lisent les variables génériques `--shape-*`
 * (voir l'en-tête), remappées dans Médine sur ses tokens :
 * `--shape-primary: var(--bg-institut)` (aplat de la section suivante),
 * `--shape-accent: var(--bg-institut-voile)` (intermédiaire),
 * `--shape-neutral: var(--bg-primary)` (teinte du haut). Le fichier source
 * portait des hex en dur (`#255042`, `#7E9286`, `#FAEEE4`). Les couleurs
 * passent par `style` : `var()` n'est pas fiable dans un attribut SVG.
 *
 * ⚠️ Le texte posé dans la zone de dégradé change de fond selon sa hauteur :
 * **refaire la mesure de contraste** à chaque retouche du tracé ou des stops.
 *
 * **Comment l'utiliser**
 * 1. À poser dans un wrapper `relative` qui contient **aussi** le texte de
 *    l'en-tête : le texte vit *dans* la zone de dégradé, jamais en dessous.
 * 2. Le voile s'ancre en haut (`top-0`) sur toute la largeur (`inset-x-0`) ;
 *    sa hauteur est fixée par breakpoint (`h-80 sm:h-[30rem] lg:h-[34rem]`),
 *    car `preserveAspectRatio="none"` l'étire à la boîte qu'on lui donne.
 * 3. Le haut du voile doit tomber sur la fin de la zone précédente (photo) et
 *    le bas sur la couleur de l'aplat suivant : c'est ce qui fait le raccord.
 * 4. Le contenu du wrapper est en `relative` pour passer au-dessus du voile.
 *
 * @forme organique
 * @param className - Ajouté **après** les classes par défaut ; sert à
 *   surcharger les hauteurs (`h-…`) selon la longueur de l'en-tête. Ne pas y
 *   mettre de couleur : elle vient des stops du dégradé.
 *
 * @example
 * <div className="relative">
 *   <VoileFuseau />
 *   <Container className="relative pt-8 pb-14 text-center">…titre…</Container>
 * </div>
 */
export function VoileFuseau({ className }: { className?: string }) {
  const id = useIdSvg("fuseau");
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 1375 899 400"
      preserveAspectRatio="none"
      className={cx(
        "pointer-events-none absolute inset-x-0 top-0 h-80 w-full sm:h-[30rem] lg:h-[34rem]",
        className,
      )}
    >
      <path
        d="M900.358 1618.02C558.782 1693.6 -835.711 1751.01 -916.986 1572.58C-998.261 1394.15 -192.575 1386.08 149 1310.5C490.576 1234.92 1353.1 1080.77 1434.38 1259.2C1515.65 1437.62 1241.93 1542.44 900.358 1618.02Z"
        fill={`url(#${id})`}
      />
      {/* Dégradé vertical : y1 (bas, 1677.5) → y2 (haut, 1274.5), x identiques.
          La `viewBox` commence à y = 1375, soit 75 % du trajet : le haut visible
          du voile est donc presque au palier intermédiaire (stop 0.817, y ≈
          1348), et la teinte du haut (stop 1, y = 1274.5) est **hors champ**.
          Voulu — la part claire du fondu se joue derrière la lisière de la
          photo, la bande s'ouvre déjà sur le palier.
          `id` unique par instance (`useIdSvg`) : plusieurs `<VoileFuseau />`
          sur une même page ne partagent plus le dégradé. */}
      <defs>
        <linearGradient
          id={id}
          x1="416.5"
          y1="1677.5"
          x2="416.5"
          y2="1274.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop style={{ stopColor: "var(--shape-primary)" }} />
          <stop offset="0.817339" style={{ stopColor: "var(--shape-accent)" }} />
          <stop offset="1" style={{ stopColor: "var(--shape-neutral)" }} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ══ Bords — aplat net de la section suivante ══════════════════════════════ */

/*
 * Pas de `viewBox` recadrée : la hauteur du bord est un choix de design, pas
 * une contrainte d'ancrage (BordCourbe et BordVague laissent ~25 % de vide en
 * haut du repère). Inverser : `-scale-y-100` (en haut de la section B),
 * `-scale-x-100` (miroir).
 */

/**
 * Courbe douce, de gauche à droite. `macro-edge-curve`.
 * @forme organique
 * @param className - Ancrage, taille et teinte de la section suivante.
 * @example
 * <BordCourbe className="absolute inset-x-0 -bottom-px h-16 w-full text-bg-inverse" />
 */
export function BordCourbe({ className }: Props) {
  return (
    <Bord className={className}>
      <path d="M0 120V70C360 10 900 130 1440 30V120Z" />
    </Bord>
  );
}

/**
 * Vague régulière, deux ondulations. `macro-edge-wave`.
 * @forme organique
 * @param className - Ancrage, taille et teinte de la section suivante.
 * @example
 * <BordVague className="absolute inset-x-0 -bottom-px h-16 w-full text-bg-inverse" />
 */
export function BordVague({ className }: Props) {
  return (
    <Bord className={className}>
      <path d="M0 120V64C240 20 480 20 720 60S1200 104 1440 60V120Z" />
    </Bord>
  );
}

/**
 * Biais droit, haut à gauche → bas à droite ; à réserver aux univers
 * angulaires. `macro-edge-slant`.
 * @forme géométrique
 * @param className - Ancrage, taille et teinte de la section suivante.
 * @example
 * <BordBiais className="absolute inset-x-0 -bottom-px h-20 w-full text-bg-inverse" />
 */
export function BordBiais({ className }: Props) {
  return (
    <Bord className={className}>
      <path d="M0 120V16L1440 104V120Z" />
    </Bord>
  );
}

/**
 * Arc creusé : la section suivante remonte sur les côtés. `macro-edge-arc`.
 * @forme arrondi
 * @param className - Ancrage, taille et teinte de la section suivante.
 * @example
 * <BordArc className="absolute inset-x-0 -bottom-px h-16 w-full text-bg-inverse" />
 */
export function BordArc({ className }: Props) {
  return (
    <Bord className={className}>
      <path d="M0 120V0Q720 150 1440 0V120Z" />
    </Bord>
  );
}

/* ══ Exemples de pose ══════════════════════════════════════════════════════ */

/**
 * Section « Pour qui » de Médine, partie haute : fuseau en tête (raccord hero
 * → vert). Le texte de l'en-tête vit **dans** la zone de dégradé. La partie
 * basse (biseau derrière la liste) est dans `macro/casser-aplat.tsx`.
 *
 * ```tsx
 * <Section className="overflow-hidden">
 *   <div className="relative">
 *     <VoileFuseau />
 *     <Container className="relative …">…logo, titre…</Container>
 *   </div>
 *   …liste avec VoileBiseau…
 * </Section>
 * ```
 *
 * Transition par un bord : le bord est posé **dans la section A**, teinté de
 * la couleur de la section B. `-bottom-px` recouvre le liseré d'arrondi
 * sous-pixel ; `pb-*` réserve la place pour que le contenu ne passe pas dessous.
 *
 * ```tsx
 * <section className="relative bg-bg-primary pb-24">
 *   <Container>…contenu…</Container>
 *   <BordCourbe className="absolute inset-x-0 -bottom-px h-16 w-full text-bg-inverse" />
 * </section>
 * <section className="bg-bg-inverse">…</section>
 * ```
 */
