/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MÉSO › ANCRER UN CHIFFRE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @echelle méso
 * @role    ancrer-chiffre
 * @preview https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY
 *
 * Anneaux centrés derrière un chiffre clé, une icône ou un avatar : ils lui
 * donnent un socle et le détachent du texte courant. Purement décoratifs, ils
 * ne représentent aucune valeur (même `AnneauProgression`).
 *
 * Invariants de ce fichier :
 * 1. `viewBox` recadrée sur le cercle extérieur : la boîte de l'élément *est*
 *    l'anneau, donc le centrage se fait sur la boîte.
 * 2. `currentColor` → `text-<token>`.
 * 3. Traits fins en `--shape-stroke` non déformé (`overflow-visible` pour ne
 *    pas les rogner) ; seul `AnneauProgression` a un trait épais
 *    proportionnel, inclus dans sa `viewBox`.
 *
 * **Comment l'utiliser**
 * 1. Le chiffre dans un conteneur `relative isolate` (taille fixe ou `inline-grid`).
 * 2. Anneau en `absolute left-1/2 top-1/2 -z-10 -translate-x-1/2
 *    -translate-y-1/2`, largeur 1,5 à 2× celle du chiffre.
 *
 * @example
 * <div className="relative isolate grid size-32 place-items-center">
 *   <AnneauConcentrique className="absolute left-1/2 top-1/2 -z-10 w-48 -translate-x-1/2 -translate-y-1/2 text-accent/[0.4]" />
 *   <span className="text-5xl">12</span>
 * </div>
 */

import type { ReactNode } from "react";

/* ══ Utilitaires inlinés ═══════════════════════════════════════════════════ */

/** Concatène des classes en ignorant les valeurs falsy (mini-`clsx`). */
function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Invariants communs : SVG inline, décoratif. */
function Anneau({
  viewBox,
  className,
  children,
}: {
  viewBox: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={viewBox}
      className={cx("pointer-events-none select-none", className)}
    >
      {children}
    </svg>
  );
}

/** Trait fin, épaisseur `--shape-stroke` jamais déformée par le redimensionnement. */
const TRAIT = { fill: "none", stroke: "currentColor", vectorEffect: "non-scaling-stroke" } as const;
const EPAISSEUR = { strokeWidth: "var(--shape-stroke, 1.5)" };

type Props = { className?: string };

/**
 * Trois cercles concentriques qui s'effacent vers l'extérieur.
 * `meso-ring-concentric`. `viewBox` recadrée à `10 10 180 180`.
 * @forme radial
 * @param className - Position, largeur et teinte (`text-x/[0.4]`).
 * @example
 * <AnneauConcentrique className="absolute left-1/2 top-1/2 -z-10 w-48 -translate-x-1/2 -translate-y-1/2 text-accent/[0.4]" />
 */
export function AnneauConcentrique({ className }: Props) {
  return (
    <Anneau viewBox="10 10 180 180" className={cx("overflow-visible", className)}>
      <g {...TRAIT} style={EPAISSEUR}>
        <circle cx="100" cy="100" r="50" />
        <circle cx="100" cy="100" r="70" strokeOpacity={0.6} />
        <circle cx="100" cy="100" r="90" strokeOpacity={0.3} />
      </g>
    </Anneau>
  );
}

/**
 * Piste + arc épais à ~70 %, décoratif. `meso-ring-progress`. Trait
 * **proportionnel** à la taille (pas de `non-scaling-stroke`), inclus dans la
 * `viewBox` recadrée (`14 14 172 172`).
 * @forme radial
 * @param className - Position, largeur et teinte.
 * @example
 * <AnneauProgression className="absolute left-1/2 top-1/2 -z-10 w-40 -translate-x-1/2 -translate-y-1/2 text-primary" />
 */
export function AnneauProgression({ className }: Props) {
  return (
    <Anneau viewBox="14 14 172 172" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="12">
        <circle cx="100" cy="100" r="80" strokeOpacity={0.2} />
        <circle
          cx="100"
          cy="100"
          r="80"
          pathLength={100}
          strokeDasharray="70 100"
          strokeLinecap="round"
          transform="rotate(-115 100 100)"
        />
      </g>
    </Anneau>
  );
}

/**
 * Disque plein à 18 % entouré d'un anneau pointillé. `meso-ring-dotted`.
 * `viewBox` recadrée à `10 10 180 180`.
 * @forme radial
 * @param className - Position, largeur et teinte.
 * @example
 * <AnneauPointille className="absolute left-1/2 top-1/2 -z-10 w-40 -translate-x-1/2 -translate-y-1/2 text-accent" />
 */
export function AnneauPointille({ className }: Props) {
  return (
    <Anneau viewBox="10 10 180 180" className={cx("overflow-visible", className)}>
      <circle cx="100" cy="100" r="66" fill="currentColor" fillOpacity={0.18} />
      <circle
        cx="100"
        cy="100"
        r="90"
        {...TRAIT}
        strokeWidth="2"
        strokeDasharray="1 7"
        strokeLinecap="round"
      />
    </Anneau>
  );
}
