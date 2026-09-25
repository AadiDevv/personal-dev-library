/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MACRO › CASSER UN APLAT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @echelle macro
 * @role    casser-aplat
 * @preview https://claude.ai/artifact/FDtmxHBtV4Hbz1eJ1VsUq6
 *
 * Formes ton sur ton, à l'échelle de la section, qui débordent du cadre. Elles
 * cassent un aplat uni ; le titre posé dessus profite du changement de fond.
 * Rôle voisin, à ne pas confondre : `meso/fond-de-lecture` (forme dédiée,
 * posée juste sous un titre, ex. VoileCarres).
 *
 * Invariants de ce fichier :
 * 1. Chaque composition = 1 à 4 formes qui se chevauchent, chacune avec une
 *    opacité **relative** (0.45 → 1). Les recouvrements créent la profondeur.
 * 2. Intensité globale par la variable CSS `--i` (défaut 0.12) :
 *    `className="[--i:0.07]"` → discret (valeur de production du Biseau),
 *    `0.12` → standard, `0.2` → maximum avant que la forme ne s'impose.
 * 3. Couleur : `currentColor` → `text-<token>`. Ton sur ton : sur aplat foncé,
 *    teinte claire ; sur aplat clair, teinte foncée.
 * 4. Cadre fixe 400×260 en `preserveAspectRatio="xMidYMid slice"` : la
 *    composition **remplit** la section et se recadre selon son ratio (pas de
 *    viewBox recadrée ici, contrairement aux voiles : c'est un fond, pas une
 *    forme à ancrer).
 *
 * Deux formes hors compositions, en fin de fichier, suivent les conventions
 * des voiles (opacité dans la classe `text-x/[α]`, pas de `--i`) :
 * `VoileBiseau` (production Médine, intouchable) et `CoinQuart` (ancrée dans
 * un coin, `viewBox` pleine forme).
 *
 * **Comment l'utiliser**
 * 1. Parent `relative isolate overflow-hidden`, fond = l'aplat à casser.
 * 2. Composition en premier enfant : `absolute inset-0 -z-10 size-full`.
 * 3. Contenu après, sans z-index particulier.
 * 4. Si la forme se remarque avant le titre, baisser `--i`.
 *
 * @example
 * <section className="relative isolate overflow-hidden bg-brand-900 text-brand-50">
 *   <Nappes className="absolute inset-0 -z-10 size-full [--i:0.1]" />
 *   <Container>…titre…</Container>
 * </section>
 */

import type { CSSProperties, ReactNode } from "react";

/* ══ Utilitaires inlinés ═══════════════════════════════════════════════════ */

function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Opacité relative × intensité globale `--i`. */
const o = (r: number): CSSProperties => ({ fillOpacity: `calc(var(--i, 0.12) * ${r})` });

/** Galet de base (boîte 200×140), réutilisé et transformé par les compositions. */
const GALET = "M100 4C160 2 198 40 196 78C194 118 150 138 96 136C40 134 2 110 4 70C6 30 44 6 100 4Z";

/** Invariants communs : SVG inline, décoratif, cadre 400×260 en slice. */
function Composition({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
      fill="currentColor"
      className={cx("pointer-events-none select-none", className)}
    >
      {children}
    </svg>
  );
}

type Props = { className?: string };

/**
 * Ligne d'horizon qui traverse la section ; le titre posé sur la ligne gagne un double fond.
 * @forme organique
 */
export function VaguePleine({ className }: Props) {
  return (
    <Composition className={className}>
      <path d="M-10 150C80 90 160 170 260 120S380 60 420 90V270H-10Z" style={o(1)} />
    </Composition>
  );
}

/**
 * Deux horizons superposés : la vague du fond à mi-intensité donne de la profondeur.
 * @forme organique
 */
export function VagueDoublee({ className }: Props) {
  return (
    <Composition className={className}>
      <path d="M-10 120C80 60 160 140 260 90S380 30 420 60V270H-10Z" style={o(0.5)} />
      <path d="M-10 170C90 120 170 190 270 145S380 100 420 120V270H-10Z" style={o(1)} />
    </Composition>
  );
}

/**
 * Deux coupes parallèles à -25° (angle commun du système).
 * @forme géométrique
 */
export function BiaisPaliers({ className }: Props) {
  return (
    <Composition className={className}>
      <polygon points="0,130 400,-56 400,260 0,260" style={o(0.5)} />
      <polygon points="0,200 400,14 400,260 0,260" style={o(1)} />
    </Composition>
  );
}

/**
 * Coin plein en haut à droite ; le titre se place en bordure du triangle.
 * @forme géométrique
 */
export function TriangleAngle({ className }: Props) {
  return (
    <Composition className={className}>
      <polygon points="120,0 400,0 400,260" style={o(1)} />
    </Composition>
  );
}

/**
 * Deux masses en diagonale qui laissent un couloir pour le titre.
 * @forme organique
 */
export function Nappes({ className }: Props) {
  return (
    <Composition className={className}>
      <path d={GALET} transform="translate(170 -150) scale(2.3)" style={o(0.75)} />
      <path d={GALET} transform="translate(-170 150) scale(2.1)" style={o(0.5)} />
    </Composition>
  );
}

/**
 * Trois galets qui se chevauchent, le plus dense au centre.
 * @forme organique
 */
export function GaletsEmpiles({ className }: Props) {
  return (
    <Composition className={className}>
      <path d={GALET} transform="translate(170 10) scale(1.5)" style={o(0.5)} />
      <path d={GALET} transform="translate(230 105) scale(1.3)" style={o(0.9)} />
      <path d={GALET} transform="translate(80 150) scale(1.1)" style={o(0.6)} />
    </Composition>
  );
}

/**
 * Grands disques rognés groupés dans l'angle haut droit.
 * @forme radial
 */
export function BullesCoin({ className }: Props) {
  return (
    <Composition className={className}>
      <circle cx="360" cy="30" r="170" style={o(0.5)} />
      <circle cx="250" cy="-30" r="120" style={o(0.85)} />
      <circle cx="410" cy="190" r="110" style={o(0.6)} />
    </Composition>
  );
}

/**
 * Triangles superposés façon low-poly, ancrés à droite.
 * @forme géométrique
 */
export function Facettes({ className }: Props) {
  return (
    <Composition className={className}>
      <polygon points="170,0 400,0 400,170" style={o(0.6)} />
      <polygon points="240,260 400,80 400,260" style={o(0.85)} />
      <polygon points="110,260 330,50 360,260" style={o(0.45)} />
    </Composition>
  );
}

/**
 * Trois plans à -25°, version « aplat » des carrés de VoileCarres.
 * @forme géométrique
 */
export function PlansInclines({ className }: Props) {
  return (
    <Composition className={className}>
      <rect x="150" y="-50" width="300" height="220" transform="rotate(-25 300 60)" style={o(0.6)} />
      <rect x="230" y="70" width="260" height="240" transform="rotate(-25 360 190)" style={o(0.4)} />
      <rect x="90" y="150" width="220" height="200" transform="rotate(-25 200 250)" style={o(0.85)} />
    </Composition>
  );
}

/**
 * Trois losanges dispersés, dont un en bas à gauche pour équilibrer.
 * @forme géométrique
 */
export function LosangesEpars({ className }: Props) {
  return (
    <Composition className={className}>
      <rect x="230" y="-50" width="200" height="200" transform="rotate(45 330 50)" style={o(0.6)} />
      <rect x="310" y="135" width="160" height="160" transform="rotate(45 390 215)" style={o(0.85)} />
      <rect x="-20" y="190" width="140" height="140" transform="rotate(45 50 260)" style={o(0.45)} />
    </Composition>
  );
}

/**
 * Un galet et deux disques : organique et radial, composition équilibrée.
 * @forme mixte
 */
export function GaletDisques({ className }: Props) {
  return (
    <Composition className={className}>
      <path d={GALET} transform="translate(190 10) scale(1.6)" style={o(0.6)} />
      <circle cx="360" cy="205" r="110" style={o(0.85)} />
      <circle cx="70" cy="290" r="95" style={o(0.45)} />
    </Composition>
  );
}

/**
 * Collines superposées ancrées en bas de section.
 * @forme organique
 */
export function Dunes({ className }: Props) {
  return (
    <Composition className={className}>
      <path d="M-110 270C-15 123.7 175 123.7 270 270Z" style={o(0.5)} />
      <path d="M30 270C140 70.5 360 70.5 470 270Z" style={o(0.85)} />
      <path d="M220 270C310 130.35 490 130.35 580 270Z" style={o(0.6)} />
    </Composition>
  );
}

/**
 * Arches de hauteurs différentes, ancrées en bas à droite.
 * @forme arrondi
 */
export function ArchesDecalees({ className }: Props) {
  return (
    <Composition className={className}>
      <path d="M150 270V160A100 100 0 0 1 350 160V270Z" style={o(0.45)} />
      <path d="M250 270V195A85 85 0 0 1 420 195V270Z" style={o(0.8)} />
      <path d="M325 270V110A75 75 0 0 1 475 110V270Z" style={o(0.55)} />
    </Composition>
  );
}

/* ══ Formes ancrées (hors compositions) ════════════════════════════════════ */

/**
 * Biseau très discret (7 % d'opacité) derrière une liste, pour que l'aplat de
 * la section ne vire pas au mur uni. Tracé repris tel quel du fichier
 * (`viewBox="0 0 511 896"`) ; la maquette n'y applique qu'une homothétie
 * (×2,2568), sans rotation — d'où une `viewBox` identique au fichier et un
 * débordement latéral assumé (128 % de large, décalé à gauche) qui reproduit
 * le cadrage. Le parent doit porter `relative` et `overflow-hidden`.
 *
 * Teinte par `currentColor` : le fichier source porte un gris en dur
 * (`#B3B3B3`, `fill-opacity="0.07"`), inutilisable sur un aplat coloré. Ici
 * l'opacité est dans la classe (`text-on-media/[0.07]`) — clair sur fond
 * sombre, sombre sur fond clair : choisir le token en conséquence.
 *
 * **Comment l'utiliser**
 * 1. Le parent est `relative` **et** `overflow-hidden` (sur lui ou sur la
 *    `<Section>`), sinon le débordement à gauche crée un défilement horizontal.
 * 2. Le voile est le **premier** enfant du parent, le contenu suit en
 *    `relative` : il est peint en dessous sans z-index.
 * 3. Sa hauteur découle de sa largeur (`w-[128%]`) : plus la zone est haute,
 *    plus il faut l'élargir, ou le répéter. Il est fait pour une zone à peu
 *    près portrait (ratio 511×896) — sur une zone très large et basse, il sera
 *    rogné par `overflow-hidden`.
 * 4. Effet volontairement quasi invisible : s'il se remarque, baisser
 *    l'opacité plutôt que de le supprimer.
 *
 * @forme organique
 * @param className - Ajouté **après** les classes par défaut : sert à
 *   surcharger le décalage (`-left-[15%]`), la largeur (`w-[128%]`) ou la
 *   teinte/opacité (`text-…/[0.07]`).
 *
 * @example
 * <div className="relative overflow-hidden">
 *   <VoileBiseau />
 *   <Container className="relative">…liste…</Container>
 * </div>
 */
export function VoileBiseau({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 511 896"
      className={cx(
        "pointer-events-none absolute -left-[15%] top-0 w-[128%] text-on-media/[0.07]",
        className,
      )}
    >
      <path
        d="M484.516 371.677C554.02 497.526 469.214 842.888 413.141 891.703C357.067 940.518 263.698 535.508 194.193 409.658C124.689 283.809 -44.8956 54.3086 11.1782 5.49364C67.252 -43.3213 415.012 245.828 484.516 371.677Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Quart de disque plein, ancré dans le coin **haut droit** de la section.
 * `macro-corner-quarter`. Cousin arrondi de `TriangleAngle`, mais ancré par sa
 * boîte (`right-0 top-0`) au lieu de remplir la section. Autres coins :
 * `-scale-x-100`, `-scale-y-100` ou `rotate-180`.
 *
 * @forme radial
 * @param className - Ancrage, largeur et teinte (`text-x/[0.15]`).
 * @example
 * <CoinQuart className="absolute right-0 top-0 -z-10 w-64 text-accent/[0.15]" />
 */
export function CoinQuart({ className }: Props) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 200 200"
      fill="currentColor"
      className={cx("pointer-events-none select-none", className)}
    >
      <path d="M200 0H0A200 200 0 0 0 200 200Z" />
    </svg>
  );
}

/* ══ Exemple de pose (câblage réel du projet d'origine) ════════════════════ */

/**
 * Section « Pour qui » de Médine, partie basse : biseau derrière la liste des
 * profils. La partie haute (fuseau de raccord) est dans
 * `macro/raccorder-sections.tsx`. Le voile est le premier enfant, le contenu
 * suit en `relative` : peint au-dessus sans z-index. `overflow-hidden` est sur
 * la `<Section>` et coupe le débordement à gauche.
 *
 * ```tsx
 * <Section className="overflow-hidden">
 *   …en-tête avec VoileFuseau…
 *   <div className="relative">
 *     <VoileBiseau />
 *     <Container className="relative …">…profils…</Container>
 *   </div>
 * </Section>
 * ```
 */
