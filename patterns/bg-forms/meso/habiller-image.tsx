/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MÉSO › HABILLER UNE IMAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @echelle méso
 * @role    habiller-image
 * @preview https://claude.ai/artifact/YNATqdqwjBDviWiuD5ytsY
 *
 * Cadre qui découpe une image (arche, coin, galet, pilule), avec un carré à
 * -25° optionnel derrière. Sort la photo du rectangle par défaut et la relie à
 * l'angle commun du système (celui de `VoileCarres`).
 *
 * Invariants de ce fichier :
 * 1. Seule forme **à contenu** de la bibliothèque : d'où les props `variant`,
 *    `backdrop` et `children` en plus de `className`.
 * 2. Le carré arrière suit `currentColor` du cadre → `text-<token>/[α]`.
 * 3. `id` du `clipPath` (variante galet) unique par instance (`useId`).
 *
 * **Comment l'utiliser**
 * 1. Taille du cadre par `className` (`h-96 w-72`) ; l'image le remplit
 *    (`next/image` en `fill` + `object-cover`).
 * 2. Avec `backdrop`, teinter le cadre (`text-accent/[0.4]`) : le carré
 *    déborde en haut à gauche, prévoir la place ou un parent `overflow-hidden`.
 *
 * @example
 * <CadreImage variant="arche" backdrop className="h-96 w-72 text-accent/[0.4]">
 *   <Image src={…} alt="…" fill className="object-cover" />
 * </CadreImage>
 */

import { useId, type ReactNode } from "react";

/* ══ Utilitaires inlinés ═══════════════════════════════════════════════════ */

/** Concatène des classes en ignorant les valeurs falsy (mini-`clsx`). */
function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * `id` unique par instance pour les `<defs>` : deux cadres sur une page, sans
 * collision. `useId` renvoie des `:` que `url(#…)` n'accepte pas, d'où le
 * nettoyage.
 */
function useIdSvg(prefixe: string): string {
  return prefixe + useId().replace(/[^a-zA-Z0-9]/g, "");
}

type VarianteCadre = "arche" | "coin" | "galet" | "pilule";

/** Découpes par `border-radius` ; `galet` passe par un `clipPath` SVG. */
const ARRONDIS: Record<Exclude<VarianteCadre, "galet">, string> = {
  arche: "rounded-t-full rounded-b-xl",
  coin: "rounded-lg rounded-tl-[5rem]",
  pilule: "rounded-full",
};

/**
 * Cadre qui découpe une image, avec un carré à -25° optionnel derrière.
 * `ShapeFrame` + `meso-frame-square`. Variantes : `arche` (arch), `coin`
 * (corner), `galet` (blob), `pilule` (pill).
 *
 * La `viewBox` du carré est recadrée sur le carré tourné (`-2.2 3.8 98.3
 * 98.3`) : la source en rognait les coins. Sa position (`-left-[20.6%]
 * -top-[1.4%]`, 118 %) reproduit le placement d'origine.
 *
 * @forme arrondi
 * @param variant - Forme de la découpe.
 * @param backdrop - Ajoute le carré à -25° derrière l'image.
 * @param className - Taille, position et teinte du carré.
 * @param children - L'image.
 * @example
 * <CadreImage variant="galet" className="size-80">
 *   <Image src={…} alt="…" fill className="object-cover" />
 * </CadreImage>
 */
export function CadreImage({
  variant,
  backdrop = false,
  className,
  children,
}: {
  variant: VarianteCadre;
  backdrop?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const id = useIdSvg("cadre");
  return (
    <div className={cx("relative isolate", className)}>
      {backdrop && (
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="-2.2 3.8 98.3 98.3"
          className="pointer-events-none absolute -left-[20.6%] -top-[1.4%] -z-10 h-[118%] w-[118%] select-none"
        >
          <rect
            x="10"
            y="16"
            width="74"
            height="74"
            transform="rotate(-25 47 53)"
            fill="currentColor"
          />
        </svg>
      )}
      {variant === "galet" && (
        <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute">
          <clipPath id={id} clipPathUnits="objectBoundingBox">
            <path d="M.5 .02C.8 .01 .98 .18 .97 .46C.96 .75 .87 .99 .51 .99C.17 1 .02 .78 .03 .49C.04 .22 .2 .03 .5 .02Z" />
          </clipPath>
        </svg>
      )}
      <div
        className={cx("relative h-full w-full overflow-hidden", variant !== "galet" && ARRONDIS[variant])}
        style={variant === "galet" ? { clipPath: `url(#${id})` } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
