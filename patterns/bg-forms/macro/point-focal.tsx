/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MACRO › CRÉER UN POINT FOCAL
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @echelle macro
 * @role    point-focal
 * @preview https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY
 *
 * Halos de couleur floutés qui attirent l'œil vers une zone de la section
 * (titre de CTA, visuel produit). Surtout efficaces sur fond sombre.
 * Rôle voisin : `macro/casser-aplat` (formes nettes ton sur ton, qui animent le
 * fond sans désigner de zone).
 *
 * Invariants de ce fichier :
 * 1. Ellipses nettes floutées en CSS (plus léger qu'un `feGaussianBlur`),
 *    flou réglé par `--shape-blur` (défaut 56px) — pas par une classe
 *    `blur-*`, qui entrerait en conflit avec celle de la forme.
 * 2. `viewBox` recadrée sur les ellipses : le flou déborde de la boîte
 *    d'environ son rayon, d'où un parent `overflow-hidden`.
 * 3. `HaloSimple` suit `currentColor` ; `HaloDuo` et `HaloTrio` sont
 *    multi-tons et lisent `--shape-accent` / `--shape-neutral` (à déclarer
 *    dans le thème, sinon noir — voir le README) : les doser avec `opacity-*`.
 *
 * **Comment l'utiliser**
 * 1. Parent `relative isolate overflow-hidden`.
 * 2. Halo en `absolute -z-10`, décalé vers la zone à désigner, largeur en `rem`.
 * 3. Opacité conseillée 0.7 (`text-x/[0.7]` ou `opacity-70`).
 *
 * @example
 * <section className="relative isolate overflow-hidden bg-bg-inverse">
 *   <HaloDuo className="absolute -right-24 -top-16 -z-10 w-[40rem] opacity-70" />
 *   <Container>…titre, bouton…</Container>
 * </section>
 */

import type { ReactNode } from "react";

/* ══ Utilitaires inlinés ═══════════════════════════════════════════════════ */

/** Concatène des classes en ignorant les valeurs falsy (mini-`clsx`). */
function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Invariants communs : SVG inline, décoratif, flou `--shape-blur`. */
function Halo({
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
      className={cx("pointer-events-none select-none blur-[var(--shape-blur,56px)]", className)}
    >
      {children}
    </svg>
  );
}

type Props = { className?: string };

/**
 * Un halo, teinte `currentColor`. `macro-glow-single`.
 * @forme flou
 * @param className - Ancrage, largeur et teinte (`text-x/[0.7]`).
 * @example
 * <HaloSimple className="absolute -left-20 top-10 -z-10 w-[32rem] text-accent/[0.7]" />
 */
export function HaloSimple({ className }: Props) {
  return (
    <Halo viewBox="120 80 360 240" className={className}>
      <ellipse cx="300" cy="200" rx="180" ry="120" fill="currentColor" />
    </Halo>
  );
}

/**
 * Deux halos mêlés : accent + neutre. `macro-glow-duo`. Multi-tons : ignore
 * `text-*`, doser avec `opacity-*`.
 * @forme flou
 * @param className - Ancrage, largeur et opacité.
 * @example
 * <HaloDuo className="absolute -right-24 -top-16 -z-10 w-[40rem] opacity-70" />
 */
export function HaloDuo({ className }: Props) {
  return (
    <Halo viewBox="100 80 390 240" className={className}>
      <ellipse cx="250" cy="190" rx="150" ry="110" style={{ fill: "var(--shape-accent)" }} />
      <ellipse
        cx="370"
        cy="230"
        rx="120"
        ry="90"
        style={{ fill: "var(--shape-neutral)" }}
        fillOpacity={0.6}
      />
    </Halo>
  );
}

/**
 * Trois halos : accent + neutre + accent éclairci. `macro-glow-trio`.
 * Multi-tons, comme `HaloDuo`.
 * @forme flou
 * @param className - Ancrage, largeur et opacité.
 * @example
 * <HaloTrio className="absolute left-1/2 top-0 -z-10 w-[48rem] -translate-x-1/2 opacity-70" />
 */
export function HaloTrio({ className }: Props) {
  return (
    <Halo viewBox="90 55 410 270" className={className}>
      <ellipse cx="240" cy="200" rx="150" ry="110" style={{ fill: "var(--shape-accent)" }} />
      <ellipse
        cx="380"
        cy="240"
        rx="120"
        ry="85"
        style={{ fill: "var(--shape-neutral)" }}
        fillOpacity={0.55}
      />
      <ellipse
        cx="330"
        cy="120"
        rx="90"
        ry="65"
        style={{ fill: "var(--shape-accent)" }}
        fillOpacity={0.6}
      />
    </Halo>
  );
}

/* ══ Exemple de pose ═══════════════════════════════════════════════════════ */

/**
 * CTA sombre : halo multi-tons en haut à droite, grain par-dessus
 * (`TextureGrain`, dans `macro/matiere.tsx`). Tous deux en `-z-10` : l'ordre
 * du DOM décide (le grain, après, se fond sur le halo et le fond). `isolate`
 * borne le `mix-blend-overlay` du grain à la section ; `overflow-hidden` coupe
 * le flou qui déborde.
 *
 * ```tsx
 * <section className="relative isolate overflow-hidden bg-bg-inverse py-20 text-text-inverse">
 *   <HaloDuo className="absolute -right-24 -top-16 -z-10 w-[40rem] opacity-70" />
 *   <TextureGrain className="absolute inset-0 -z-10 h-full w-full opacity-40" />
 *   <Container className="text-center">…titre, bouton…</Container>
 * </section>
 * ```
 */
