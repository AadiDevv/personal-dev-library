/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MÉSO › GUIDER L'ŒIL
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @echelle méso
 * @role    guider-oeil
 * @preview https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY
 *
 * Lignes qui portent une direction : relier des étapes, conduire le regard
 * d'un bloc vers le suivant. Rôle voisin : `macro/rythmer-section` (lignes de
 * coin, sans direction, qui animent la section entière).
 *
 * Invariants de ce fichier :
 * 1. Trait `currentColor`, épaisseur `--shape-stroke` (défaut 1.5) en px
 *    écran (`non-scaling-stroke`), jamais déformée par la taille.
 * 2. `viewBox` recadrée sur la géométrie ; `overflow-visible` pour que la
 *    demi-épaisseur du trait ne soit pas rognée.
 * 3. Prop `fade` optionnelle (`radial | top | bottom | left | right`) pour que
 *    la ligne naisse et meure dans le fond.
 *
 * **Comment l'utiliser**
 * 1. Parent `relative isolate overflow-hidden`, ligne en `absolute -z-10`.
 * 2. Placer ses extrémités sur les éléments à relier, pas au hasard.
 * 3. Opacité 0.4 (`text-x/[0.4]`) : la ligne se suit sans se lire.
 *
 * @example
 * <TraceFlux fade="right" className="absolute inset-x-0 top-1/3 -z-10 h-40 w-full text-accent/[0.4]" />
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
  preserveAspectRatio,
  fade,
  className,
  children,
}: {
  viewBox: string;
  preserveAspectRatio?: string;
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
      preserveAspectRatio={preserveAspectRatio}
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

/**
 * Ligne sinueuse doublée d'un écho pointillé — relie des étapes, traverse une
 * section. `meso-line-flow`. Étirée en `preserveAspectRatio="none"` (un trait
 * non déformé le supporte) : donner largeur **et** hauteur. `viewBox` recadrée
 * de `0 0 1000 400` à la bande réellement occupée (`0 153.7 1000 179.4`).
 * @forme linéaire
 * @param className - Ancrage, taille et teinte (`text-x/[0.4]`).
 * @param fade - Fondu des bords, optionnel.
 * @example
 * <TraceFlux fade="right" className="absolute inset-x-0 top-1/3 -z-10 h-40 w-full text-accent/[0.4]" />
 */
export function TraceFlux({ className, fade }: Props) {
  return (
    <Lignes
      viewBox="0 153.7 1000 179.4"
      preserveAspectRatio="none"
      fade={fade}
      className={className}
    >
      <path {...TRAIT} style={EPAISSEUR} d="M0 250C150 110 300 380 520 300S820 90 1000 190" />
      <path
        {...TRAIT}
        style={EPAISSEUR}
        strokeOpacity={0.4}
        strokeDasharray="4 8"
        d="M0 268C150 128 300 398 520 318S820 108 1000 208"
      />
    </Lignes>
  );
}

/**
 * Arcs parallèles ancrés dans le coin **bas gauche**, qui s'effacent vers
 * l'extérieur : ils ouvrent la lecture vers le haut à droite.
 * `meso-line-arcs`. Jumeau de `CoinArcs` (`macro/rythmer-section`, coin haut
 * droit). `viewBox` recadrée de `0 0 400 400` à `0 40 360 360` : le centre des
 * arcs est le coin bas gauche de la boîte, `bottom-0 left-0` l'ancre.
 * @forme radial
 * @param className - Ancrage, largeur et teinte (`text-x/[0.4]`).
 * @param fade - Fondu des bords, optionnel.
 * @example
 * <TraceArcs className="absolute bottom-0 left-0 -z-10 w-72 text-accent/[0.4]" />
 */
export function TraceArcs({ className, fade }: Props) {
  return (
    <Lignes viewBox="0 40 360 360" fade={fade} className={className}>
      <g {...TRAIT} style={EPAISSEUR}>
        {[120, 180, 240, 300, 360].map((r, i) => (
          <path key={r} d={`M0 ${400 - r}A${r} ${r} 0 0 1 ${r} 400`} strokeOpacity={1 - i * 0.16} />
        ))}
      </g>
    </Lignes>
  );
}
