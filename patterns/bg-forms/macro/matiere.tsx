/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MACRO › DONNER DE LA MATIÈRE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @echelle macro
 * @role    matiere
 * @preview https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY
 *
 * Motifs répétés (points, grille, hachures, grain) qui donnent du grain à un
 * fond uni sans y poser de forme. Rôle voisin : `macro/casser-aplat` (masses
 * de couleur qui découpent l'aplat).
 *
 * Invariants de ce fichier :
 * 1. Pas de `viewBox` : le motif remplit la boîte de l'élément et garde sa
 *    taille en px quelle que soit la section (exception assumée au recadrage).
 * 2. `currentColor` → `text-<token>`, sauf `TextureGrain` (neutre, dosé par
 *    `opacity-*`).
 * 3. `id` des motifs et filtres unique par instance (`useId`).
 * 4. Toujours avec un `fade`, sinon effet papier peint.
 *
 * **Comment l'utiliser**
 * 1. Parent `relative isolate overflow-hidden`.
 * 2. Texture en premier enfant : `absolute inset-0 -z-10 h-full w-full`.
 * 3. `fade="radial"` par défaut ; `top` / `bottom` pour ne texturer qu'une
 *    moitié.
 * 4. Opacités conseillées : points 0.4, grille et hachures 0.15, grain 0.4.
 *
 * @example
 * <section className="relative isolate overflow-hidden bg-bg-primary">
 *   <TexturePoints fade="radial" className="absolute inset-0 -z-10 h-full w-full text-primary/[0.4]" />
 *   <Container>…</Container>
 * </section>
 */

import { useId, type ReactNode } from "react";

/* ══ Utilitaires inlinés ═══════════════════════════════════════════════════ */

/** Concatène des classes en ignorant les valeurs falsy (mini-`clsx`). */
function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * `id` unique par instance pour les `<defs>` : deux fois la même texture sur
 * une page, sans collision. `useId` renvoie des `:` que `url(#…)` n'accepte
 * pas, d'où le nettoyage.
 */
function useIdSvg(prefixe: string): string {
  return prefixe + useId().replace(/[^a-zA-Z0-9]/g, "");
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

/** Invariants communs : SVG inline, décoratif, sans `viewBox`, fondu optionnel. */
function Texture({
  fade,
  className,
  children,
}: {
  fade?: Fondu;
  className?: string;
  children: ReactNode;
}) {
  const masque = fade && FONDUS[fade];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cx("pointer-events-none select-none", className)}
      style={masque ? { maskImage: masque, WebkitMaskImage: masque } : undefined}
    >
      {children}
    </svg>
  );
}

type Props = { className?: string; fade?: Fondu };

/**
 * Trame de points, pas de 20 px. `macro-texture-dots`.
 * @forme texture
 * @param className - Boîte et teinte (`text-x/[0.4]`).
 * @param fade - Fondu des bords, `radial` recommandé.
 * @example
 * <TexturePoints fade="radial" className="absolute inset-0 -z-10 h-full w-full text-primary/[0.4]" />
 */
export function TexturePoints({ className, fade }: Props) {
  const id = useIdSvg("points");
  return (
    <Texture fade={fade} className={className}>
      <defs>
        <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </Texture>
  );
}

/**
 * Grille orthogonale, pas de 32 px. `macro-texture-grid`.
 * @forme texture
 * @param className - Boîte et teinte (`text-x/[0.15]`).
 * @param fade - Fondu des bords, optionnel.
 * @example
 * <TextureGrille fade="bottom" className="absolute inset-0 -z-10 h-full w-full text-primary/[0.15]" />
 */
export function TextureGrille({ className, fade }: Props) {
  const id = useIdSvg("grille");
  return (
    <Texture fade={fade} className={className}>
      <defs>
        <pattern id={id} width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </Texture>
  );
}

/**
 * Hachures à -25°, l'angle commun du système (celui de `VoileCarres`).
 * `macro-texture-hatch`.
 * @forme texture
 * @param className - Boîte et teinte (`text-x/[0.15]`).
 * @param fade - Fondu des bords, optionnel.
 * @example
 * <TextureHachures fade="radial" className="absolute inset-0 -z-10 h-full w-full text-accent/[0.15]" />
 */
export function TextureHachures({ className, fade }: Props) {
  const id = useIdSvg("hachures");
  return (
    <Texture fade={fade} className={className}>
      <defs>
        <pattern
          id={id}
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-25)"
        >
          <line x1="0" y1="0" x2="0" y2="12" stroke="currentColor" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </Texture>
  );
}

/**
 * Grain photographique neutre : bruit gris fusionné en `mix-blend-overlay`,
 * il éclaircit et assombrit le fond **quelle que soit sa couleur**.
 * `macro-texture-grain`. Ne suit pas `currentColor` : doser avec `opacity-*`.
 * Le blend se fait avec ce qui est peint dessous dans le même contexte
 * d'empilement : poser le grain après le fond, dans un parent `isolate`.
 * @forme texture
 * @param className - Boîte et opacité (`opacity-40`).
 * @param fade - Fondu des bords, optionnel.
 * @example
 * <TextureGrain className="absolute inset-0 -z-10 h-full w-full opacity-40" />
 */
export function TextureGrain({ className, fade }: Props) {
  const id = useIdSvg("grain");
  return (
    <Texture fade={fade} className={cx("mix-blend-overlay", className)}>
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={3} stitchTiles="stitch" />
        <feColorMatrix
          type="matrix"
          values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"
        />
        <feComponentTransfer>
          <feFuncR type="linear" slope="2.4" intercept="-0.7" />
          <feFuncG type="linear" slope="2.4" intercept="-0.7" />
          <feFuncB type="linear" slope="2.4" intercept="-0.7" />
        </feComponentTransfer>
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </Texture>
  );
}
