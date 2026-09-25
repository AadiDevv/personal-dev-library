/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MÉSO › FOND DE LECTURE D'UN TITRE  (extrait de MEDINE_INSTITUT, Next.js App Router)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @echelle méso
 * @role    fond-de-lecture
 * @preview https://claude.ai/artifact/MrZ8k34NkjTGkqLMBZQ3hB
 *
 * Forme translucide posée **juste sous un titre** sur photo, pour le rendre
 * lisible sans dégradé ni voile uni sur toute la section : la photo reste nue
 * partout ailleurs, la lisibilité est portée par l'objet qui entoure le texte.
 * Rôle voisin, à ne pas confondre : `macro/casser-aplat` (formes à l'échelle
 * de la section, qui cassent un aplat sans cibler un titre).
 *
 * Invariants de ce fichier :
 * 1. SVG **inliné** (pas `background-image`) : couleur par `currentColor` →
 *    `text-<token>`, jamais un hex en dur.
 * 2. `viewBox` **recadrée sur la boîte réelle** des formes : `bottom-0` /
 *    `top-0` suffisent à l'ancrer, sans marge à compenser à la main.
 * 3. `aria-hidden`, `pointer-events-none` : purement décoratif, jamais
 *    cliquable — sinon il masque les liens qu'il recouvre.
 *
 * **Comment l'utiliser** : voir la JSDoc de `VoileCarres` et l'exemple de pose
 * en bas du fichier, qui porte les règles d'empilement.
 *
 * @example
 * <VoileCarres className="absolute bottom-0 z-10 left-1/2 w-[37rem] -translate-x-1/2 text-bg-primary lg:w-[46rem]" />
 */

/* ══ Utilitaires inlinés ═══════════════════════════════════════════════════ */

/** Concatène des classes en ignorant les valeurs falsy (mini-`clsx`). */
function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/* ══ Voile de carrés — fond de lecture d'un titre sur photo ════════════════ */

/**
 * Trois carrés translucides inclinés à -25°, superposés (opacités 0.45 / 0.4 /
 * 0.7). Teinte = `currentColor` : poser `text-<token>` sur l'élément.
 *
 * Source : export Figma `group-square-forms.svg` (viewBox d'origine
 * `0 0 1780 1390`, ~8 % de marge vide en bas et à gauche). Les `rect` sont
 * repris à l'identique ; seule la `viewBox` est recadrée sur la boîte des trois
 * carrés une fois tournés (`140 119.2 1507 1148.1`). Une réexportation Figma
 * change ces nombres : les recalculer (boîte englobante des formes tournées).
 *
 * **Comment l'utiliser**
 * 1. Le parent est `relative` et **se termine au bas de la zone à ancrer** (ici
 *    le bloc « texte + bande » : la bande est son dernier enfant).
 * 2. Poser le voile en `absolute bottom-0 z-10`, centré (`left-1/2
 *    -translate-x-1/2`), avec une largeur en `rem` — la hauteur suit toute
 *    seule, le ratio de la `viewBox` est conservé.
 * 3. Teinter avec `text-<token>` : c'est `currentColor` qui colore les carrés.
 * 4. Le texte va **par-dessus** (`z-20`) et **à l'intérieur** de la silhouette :
 *    un bloc centré de `max-w-xs` à `max-w-md`. Un bloc ferré au bord gauche
 *    du conteneur sortirait des carrés et perdrait son fond de lecture.
 *
 * @forme géométrique
 * @param className - Positionnement, taille et teinte, tout par classes
 *   Tailwind. Doit contenir au minimum une largeur (`w-[46rem]`), un ancrage
 *   (`absolute bottom-0`) et une teinte (`text-bg-primary`). Pas de hauteur :
 *   elle découle de la largeur.
 *
 * @example
 * <VoileCarres className="absolute bottom-0 z-10 left-1/2 w-[37rem] -translate-x-1/2 text-bg-primary lg:w-[46rem]" />
 */
export function VoileCarres({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="140 119.2 1507 1148.1"
      fill="currentColor"
      className={cx("pointer-events-none select-none", className)}
    >
      {/* Trois carrés tournés de -25° autour de leur propre coin (x y du
          `rotate`). L'ordre compte : le dernier est peint au-dessus et porte
          l'opacité la plus forte (0.7), c'est lui qui donne le fond de lecture
          principal ; les deux autres ne font que « déborder » de sa silhouette.
          Changer l'ordre ou les opacités change la lisibilité du titre. */}
      <rect
        x="140.004"
        y="400.627"
        width="666.018"
        height="695.182"
        transform="rotate(-25 140.004 400.627)"
        fillOpacity="0.45"
      />
      <rect
        x="640.513"
        y="541.948"
        width="737.35"
        height="800.38"
        transform="rotate(-25 640.513 541.948)"
        fillOpacity="0.4"
      />
      <rect
        x="363.116"
        y="510.48"
        width="769.901"
        height="757.619"
        transform="rotate(-25 363.116 510.48)"
        fillOpacity="0.7"
      />
    </svg>
  );
}

/* ══ Exemple de pose (câblage réel du projet d'origine) ════════════════════ */

/**
 * Hero : voile de carrés sous le titre, bande pleine largeur en bas.
 *
 * Empilement, à ne pas casser : la `<section>` porte `isolate`, la photo vit
 * en `-z-10`, le voile en `z-10`, texte et boutons en `z-20`. La bande, elle,
 * reste **non positionnée** : un fond statique se peint avant tout descendant
 * positionné, donc sous le voile. Lui donner `relative z-0` « pour clarifier »
 * créerait un contexte d'empilement et enfermerait ses boutons sous le voile.
 *
 * Le bloc « texte + bande » a pour dernier enfant la bande : sa hauteur s'arrête
 * exactement en bas de la bande, donc `bottom-0` ancre la pointe du voile sur
 * le bas de la bande sans aucune hauteur en dur.
 *
 * ```tsx
 * const VOILE = "left-1/2 w-[37rem] -translate-x-1/2 text-bg-primary lg:w-[46rem]";
 *
 * <section className="relative isolate flex min-h-svh flex-col">
 *   <div className="absolute inset-0 -z-10"><Image fill alt="" … /></div>
 *   <div className="relative flex flex-1 flex-col">
 *     <VoileCarres className={`absolute bottom-0 z-10 ${VOILE}`} />
 *     <div className="relative z-20 flex flex-1 …">
 *       <div className="mx-auto max-w-xs lg:max-w-md">…titre…</div>
 *     </div>
 *     <div className="bg-bg-inverse text-text-inverse">…CTA…</div>
 *   </div>
 * </section>
 * ```
 */
