/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MACRO › RYTHMER UNE SECTION
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @echelle macro
 * @role    rythmer-section
 * @preview https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY
 *
 * Lignes fines répétées, posées dans un coin de la section : elles donnent du
 * rythme sans poser de masse de couleur. Rôle voisin : `meso/guider-oeil`
 * (lignes qui relient des éléments et portent une direction).
 *
 * Invariants de ce fichier :
 * 1. Trait `currentColor`, épaisseur `--shape-stroke` (défaut 1.5) en px
 *    écran (`non-scaling-stroke`), jamais déformée par la taille.
 * 2. `viewBox` recadrée sur la géométrie ; le trait déborde donc d'une
 *    demi-épaisseur, `overflow-visible` évite qu'il soit rogné.
 * 3. Prop `fade` optionnelle (`radial | top | bottom | left | right`) pour
 *    fondre les lignes dans le fond.
 *
 * **Comment l'utiliser**
 * 1. Parent `relative isolate overflow-hidden`.
 * 2. Forme en `absolute -z-10`, ancrée dans un coin, souvent à moitié hors
 *    champ (`-right-16 -top-16`).
 * 3. Opacité discrète : 0.15 à 0.4 (`text-x/[0.15]`).
 *
 * @example
 * <section className="relative isolate overflow-hidden">
 *   <TraceContours fade="radial" className="absolute -right-16 -top-16 -z-10 w-96 text-primary/[0.15]" />
 *   <Container>…</Container>
 * </section>
 */

import type { ReactNode } from "react";

/* ══ Utilitaires inlinés ═══════════════════════════════════════════════════ */

/** Concatène des classes en ignorant les valeurs falsy (mini-`clsx`). */
function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Fondu des bords via `mask-image`. */
type Fondu = "radial" | "top" | "bottom" | "left" | "right";

const FONDUS: Record<Fondu, string> = {
  radial: "radial-gradient(closest-side, black 35%, transparent)",
  top: "linear-gradient(to bottom, transparent, black 60%)",
  bottom: "linear-gradient(to top, transparent, black 60%)",
  left: "linear-gradient(to right, transparent, black 60%)",
  right: "linear-gradient(to left, transparent, black 60%)",
};

/** Invariants communs : SVG inline, décoratif, trait non rogné, fondu optionnel. */
function Lignes({
  viewBox,
  fade,
  className,
  children,
}: {
  viewBox: string;
  fade?: Fondu;
  className?: string;
  children: ReactNode;
}) {
  const masque = fade && FONDUS[fade];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={viewBox}
      className={cx("pointer-events-none select-none overflow-visible", className)}
      style={masque ? { maskImage: masque, WebkitMaskImage: masque } : undefined}
    >
      {children}
    </svg>
  );
}

/** Trait fin, épaisseur `--shape-stroke` jamais déformée par le redimensionnement. */
const TRAIT = { fill: "none", stroke: "currentColor", vectorEffect: "non-scaling-stroke" } as const;
const EPAISSEUR = { strokeWidth: "var(--shape-stroke, 1.5)" };

type Props = { className?: string; fade?: Fondu };

/** Contour organique des courbes de niveau, répété 5 fois réduit et tourné. */
const GALET =
  "M200 12C300 8 388 84 384 198C380 306 300 392 196 388C90 384 14 300 18 196C22 92 100 16 200 12Z";

/**
 * Courbes de niveau : 5 contours emboîtés qui s'effacent vers le centre.
 * `meso-line-contours`. `viewBox` recadrée sur le contour extérieur
 * (`17.8 11.8 366.3 376.3`) ; ratio conservé, donner une largeur.
 * @forme organique
 * @param className - Ancrage, largeur et teinte (`text-x/[0.15]`).
 * @param fade - Fondu des bords, optionnel.
 * @example
 * <TraceContours fade="radial" className="absolute -right-16 -top-16 -z-10 w-96 text-primary/[0.15]" />
 */
export function TraceContours({ className, fade }: Props) {
  return (
    <Lignes viewBox="17.8 11.8 366.3 376.3" fade={fade} className={className}>
      <g {...TRAIT} style={EPAISSEUR}>
        {[1, 0.8, 0.6, 0.42, 0.24].map((echelle, i) => (
          <path
            key={echelle}
            d={GALET}
            strokeOpacity={1 - i * 0.17}
            transform={`translate(200 200) rotate(${i * 11}) scale(${echelle}) translate(-200 -200)`}
          />
        ))}
      </g>
    </Lignes>
  );
}

/**
 * Arcs concentriques depuis le coin **haut droit**, qui s'effacent vers
 * l'intérieur de la section. `macro-corner-rings`. Jumeau de `TraceArcs`
 * (`meso/guider-oeil`, coin bas gauche). `viewBox` recadrée à `20 0 180 180` :
 * `right-0 top-0` l'ancre.
 * @forme radial
 * @param className - Ancrage, largeur et teinte (`text-x/[0.4]`).
 * @param fade - Fondu des bords, optionnel.
 * @example
 * <CoinArcs className="absolute right-0 top-0 -z-10 w-72 text-accent/[0.4]" />
 */
export function CoinArcs({ className, fade }: Props) {
  return (
    <Lignes viewBox="20 0 180 180" fade={fade} className={className}>
      <g {...TRAIT} style={EPAISSEUR}>
        {[60, 100, 140, 180].map((r, i) => (
          <path key={r} d={`M${200 - r} 0A${r} ${r} 0 0 0 200 ${r}`} strokeOpacity={1 - i * 0.22} />
        ))}
      </g>
    </Lignes>
  );
}
