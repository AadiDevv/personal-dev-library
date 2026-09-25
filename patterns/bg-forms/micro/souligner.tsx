/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MICRO › SOULIGNER UN MOT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @echelle micro
 * @role    souligner
 * @preview https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY
 *
 * Gestes à main levée qui ponctuent **un mot** d'un titre : soulignement,
 * entourage, étincelle, flèche vers un CTA. Un seul par titre ; au-delà, plus
 * rien ne ressort. `AccentFleche` ne souligne pas au sens strict, elle désigne :
 * rangée ici parce qu'elle vit à la même échelle, à côté d'un mot ou d'un bouton.
 *
 * Invariants de ce fichier :
 * 1. Tailles en `em` : l'accent suit la taille du titre à chaque breakpoint.
 * 2. `currentColor` → `text-<token>`, souvent l'accent de la marque.
 * 3. Traits d'épaisseur fixe en px (`non-scaling-stroke`), `viewBox` recadrée
 *    sur le tracé, `overflow-visible` pour ne pas rogner les bouts arrondis.
 *
 * **Comment l'utiliser**
 * 1. Entourer le mot d'un `<span className="relative whitespace-nowrap">`.
 * 2. L'accent en `absolute` dans ce span, position et taille en `em` / `%`.
 * 3. Si l'accent passe sur les lettres, le mettre derrière (`-z-10` dans un
 *    parent `isolate`).
 *
 * @example
 * <span className="relative whitespace-nowrap">
 *   autrement
 *   <AccentSouligne className="absolute -bottom-[.26em] -left-[1.4%] h-[.23em] w-[103%] text-accent" />
 * </span>
 */

import type { ReactNode } from "react";

/* ══ Utilitaires inlinés ═══════════════════════════════════════════════════ */

/** Concatène des classes en ignorant les valeurs falsy (mini-`clsx`). */
function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Invariants communs : SVG inline, décoratif, trait non rogné. */
function Accent({
  viewBox,
  preserveAspectRatio,
  className,
  children,
}: {
  viewBox: string;
  preserveAspectRatio?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      className={cx("pointer-events-none select-none overflow-visible", className)}
    >
      {children}
    </svg>
  );
}

/** Trait de stylo : bouts arrondis, épaisseur en px jamais déformée. */
const STYLO = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  vectorEffect: "non-scaling-stroke",
} as const;

type Props = { className?: string };

/**
 * Double trait sous un mot. `micro-underline-scribble`. Étiré
 * (`preserveAspectRatio="none"`) à la largeur du mot ; `viewBox` recadrée de
 * `0 0 200 20` à `3 5.9 194 11.1`, recette recalculée en conséquence.
 * @forme linéaire
 * @param className - Position (em), taille et teinte.
 * @example
 * <AccentSouligne className="absolute -bottom-[.26em] -left-[1.4%] h-[.23em] w-[103%] text-accent" />
 */
export function AccentSouligne({ className }: Props) {
  return (
    <Accent viewBox="3 5.9 194 11.1" preserveAspectRatio="none" className={className}>
      <g {...STYLO} strokeWidth="3">
        <path d="M3 13C60 5 140 4 197 9" />
        <path d="M24 17C80 12 146 12 186 15" />
      </g>
    </Accent>
  );
}

/**
 * Trait unique qui remonte vers la droite. `micro-underline-swoosh`. Même
 * pose que `AccentSouligne` ; `viewBox` recadrée à `4 5.1 192 9.9`.
 * @forme linéaire
 * @param className - Position (em), taille et teinte.
 * @example
 * <AccentTrait className="absolute -bottom-[.22em] -left-[.9%] h-[.21em] w-[102%] text-accent" />
 */
export function AccentTrait({ className }: Props) {
  return (
    <Accent viewBox="4 5.1 192 9.9" preserveAspectRatio="none" className={className}>
      <path {...STYLO} strokeWidth="3.5" d="M4 15C50 6 130 2 196 8" />
    </Accent>
  );
}

/**
 * Entourage à main levée autour d'un mot. `micro-circle-scribble`. Étiré ;
 * `viewBox` recadrée de `0 0 200 80` à `7.1 5.9 183.8 66.9`.
 * @forme linéaire
 * @param className - Position (em), taille et teinte.
 * @example
 * <AccentEntourage className="absolute -left-[8%] -top-[.3em] h-[calc(100%+.6em)] w-[116%] text-accent" />
 */
export function AccentEntourage({ className }: Props) {
  return (
    <Accent viewBox="7.1 5.9 183.8 66.9" preserveAspectRatio="none" className={className}>
      <path
        {...STYLO}
        strokeWidth="2.5"
        d="M150 10C100 0 20 8 8 36C-2 64 70 76 118 72C170 68 196 50 190 30C184 12 140 6 96 12"
      />
    </Accent>
  );
}

/**
 * Étincelle à quatre branches, pleine, au coin d'un mot. `micro-sparkle`.
 * `viewBox` recadrée à `1 1 30 30`.
 * @forme géométrique
 * @param className - Position, taille (em) et teinte.
 * @example
 * <AccentEtincelle className="absolute -right-[.6em] -top-[.4em] w-[.6em] text-accent" />
 */
export function AccentEtincelle({ className }: Props) {
  return (
    <Accent viewBox="1 1 30 30" className={className}>
      <path
        d="M16 1C17 11 21 15 31 16C21 17 17 21 16 31C15 21 11 17 1 16C11 15 15 11 16 1Z"
        fill="currentColor"
      />
    </Accent>
  );
}

/**
 * Flèche courbe qui pointe vers un CTA. `micro-arrow-curve`. Orientation par
 * `className` (`-scale-x-100`, `rotate-…`) ; `viewBox` recadrée de
 * `0 0 96 56` à `6 6 79 45`.
 * @forme linéaire
 * @param className - Position, taille et teinte.
 * @example
 * <AccentFleche className="absolute -left-20 top-0 w-16 text-accent" />
 */
export function AccentFleche({ className }: Props) {
  return (
    <Accent viewBox="6 6 79 45" className={className}>
      <path {...STYLO} strokeWidth="2" d="M6 6C14 38 44 50 84 40M72 31L85 40L75 51" />
    </Accent>
  );
}

/* ══ Exemple de pose ═══════════════════════════════════════════════════════ */

/**
 * Hero clair : trame de points fondue en radial derrière le titre
 * (`TexturePoints`, dans `macro/matiere.tsx`), un mot souligné. La texture est
 * en `-z-10` dans une section `isolate` : au-dessus du fond de la section et
 * sous le texte, sans z-index sur le texte. Le soulignement vit dans un
 * `<span className="relative">` autour du mot, tailles en `em`.
 *
 * ```tsx
 * <section className="relative isolate overflow-hidden bg-bg-primary py-24">
 *   <TexturePoints fade="radial" className="absolute inset-0 -z-10 h-full w-full text-primary/[0.4]" />
 *   <Container className="text-center">
 *     <h1>
 *       Apprendre{" "}
 *       <span className="relative whitespace-nowrap">
 *         autrement
 *         <AccentSouligne className="absolute -bottom-[.26em] -left-[1.4%] h-[.23em] w-[103%] text-accent" />
 *       </span>
 *     </h1>
 *   </Container>
 * </section>
 * ```
 */
