/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPOSANT « Aperçu d'un cours »  (extrait de MEDINE_INSTITUT, Next.js App Router)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Section de page d'accueil qui présente **un cours et les livres qu'il
 * étudie**, pour conduire le visiteur à la fiche du cours. Le cours est le
 * titre, les livres sont des cartes (couverture ou trame décorative), une
 * image claire habille le fond de la section.
 *
 * Deux variantes, choisies par la prop `variante` — c'est tout l'intérêt de
 * cette fiche, voir le README pour l'arbitrage :
 * - `filet` : fond adouci partout, un trait sépare le cours de ses livres ;
 * - `bande` : fond plus présent, le contenu repose sur une bande bord à bord,
 *   translucide et floutée.
 *
 * Dans les deux cas, **un seul niveau de carte** : les livres. Le cours n'est
 * jamais enfermé dans une carte qui contiendrait elle-même les cartes des
 * livres — deux niveaux de cartes imbriqués est le motif qu'on voulait éviter.
 *
 * Server component, sans état. Ce fichier est volontairement **aplati** :
 * helper `cx`, icône, plaque d'ouvrage, trame, bouton, types et libellés y
 * sont inlinés pour rester lisible d'un seul tenant.
 */

import Image from "next/image";
import Link from "next/link";

/* ══ Utilitaires inlinés ═══════════════════════════════════════════════════ */

/** Concatène des classes en ignorant les valeurs falsy (mini-`clsx`). */
function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const IconArrowRight = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/* ══ Données attendues ═════════════════════════════════════════════════════
 *
 * Dans le projet d'origine, tout venait de Payload : un global « Aperçu d'un
 * cours » (relation vers le module vedette + image de fond) et le module
 * lui-même, dont le tableau « Ouvrages étudiés » porte titre, auteur et
 * couverture. Ici, des types neutres à remplir depuis n'importe quelle source.
 */

/** Une image prête pour `next/image`. */
export type ImageApercu = { src: string; width: number; height: number; alt: string };

/** Un livre étudié dans le cours. */
export type OuvrageApercu = {
  id?: string;
  titre: string;
  /** Quelques mots sous le titre — l'auteur le plus souvent. */
  precision?: string | null;
  /** Photo de la couverture ; sans elle, la carte affiche la trame décorative. */
  couverture?: ImageApercu | null;
};

export type CoursApercu = {
  titre: string;
  /** Lien vers la fiche du cours. */
  href: string;
  /** Une phrase, pas un résumé : le détail vit sur la fiche. */
  accroche?: string | null;
  /** Repères affichés après le libellé « Cours » — ex. `["Aqida", "Débutant"]`. */
  reperes?: string[];
  /** Ajoute « Gratuit » en accent. Le payant ne s'annonce pas (état par défaut). */
  gratuit?: boolean;
  ouvrages: OuvrageApercu[];
};

/* ══ Libellés ══════════════════════════════════════════════════════════════
 *
 * Dans le projet d'origine ils venaient du dictionnaire i18n
 * (`data/dictionaries/{fr,en}.json`, clé `apercuCours`).
 */
export const LABELS_FR = {
  titre: "Aperçu d'un cours",
  labelCours: "Cours",
  gratuit: "Gratuit",
  textesEtudies: "Textes étudiés",
  cta: "Découvrir ce cours",
};

/* ══ Trame décorative ══════════════════════════════════════════════════════
 *
 * Motif rub' al-hizb (deux carrés superposés à 45°), posé à la place d'une
 * couverture absente : un aplat vide lirait comme un bug de chargement, une
 * trame lit comme une intention. Masque CSS répété plutôt qu'un `<svg>` mis à
 * l'échelle — la taille de cellule reste identique quel que soit le conteneur.
 * La couleur vient de la classe `text-*` du parent (`bg-current`).
 */
const CELLULE_MOTIF = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><g fill='none' stroke='%23000' stroke-width='1'><rect x='9.5' y='9.5' width='21' height='21'/><rect x='9.5' y='9.5' width='21' height='21' transform='rotate(45 20 20)'/></g></svg>`;
const SOURCE_MOTIF = `url("data:image/svg+xml,${CELLULE_MOTIF}")`;

function Motif({ taille = 56, className }: { taille?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("block h-full w-full bg-current", className)}
      style={{
        maskImage: SOURCE_MOTIF,
        maskSize: `${taille}px ${taille}px`,
        maskRepeat: "repeat",
        WebkitMaskImage: SOURCE_MOTIF,
        WebkitMaskSize: `${taille}px ${taille}px`,
        WebkitMaskRepeat: "repeat",
      }}
    />
  );
}

/* ══ Fond de section ═══════════════════════════════════════════════════════ */

type Ton = "page" | "sable";

const TON_CLASS: Record<Ton, string> = {
  page: "bg-bg-primary text-text-primary",
  sable: "bg-bg-secondary text-text-primary",
};

/**
 * Voile de la variante `filet`, dans la couleur de la bande : c'est lui qui
 * garde le texte lisible, puisque rien d'autre ne sépare le texte de l'image.
 */
const VOILE_FILET: Record<Ton, string> = {
  page: "bg-bg-primary/55",
  sable: "bg-bg-secondary/55",
};

/* ══ Composant ═════════════════════════════════════════════════════════════ */

export default function ApercuCours({
  cours,
  variante = "filet",
  imageFond,
  ton = "sable",
  labels = LABELS_FR,
}: {
  cours: CoursApercu;
  variante?: "filet" | "bande";
  /** Photo **claire** plein fond, affichée à 50 %. Sans elle, fond uni. */
  imageFond?: ImageApercu | null;
  /** Couleur de la bande — à faire suivre à l'alternance des sections de la page. */
  ton?: Ton;
  labels?: typeof LABELS_FR;
}) {
  const textes = cours.ouvrages;
  const bande = variante === "bande";

  const blocCours = (
    <div
      className={cx(
        "flex min-w-0 flex-col items-start gap-3 lg:justify-center",
        // Variante filet : le trait part du cours vers ses livres — horizontal
        // quand ils s'empilent, vertical côte à côte. Le `-mr-8` + `pr-8` le
        // pose au milieu de la gouttière de 64 px (`lg:gap-16`) au lieu de le
        // coller au bord gauche des livres.
        !bande &&
          textes.length > 0 &&
          "border-b border-text-primary/35 pb-7 lg:-mr-8 lg:border-r lg:border-b-0 lg:pr-8 lg:pb-0",
      )}
    >
      <p className="text-xs font-semibold tracking-[0.22em] text-accent uppercase">
        {labels.labelCours}
        <span className="text-text-muted">
          {(cours.reperes ?? []).map((repere) => ` · ${repere}`).join("")}
        </span>
        {cours.gratuit && ` · ${labels.gratuit}`}
      </p>
      <h3 className="font-display text-3xl leading-[1.05] tracking-tight text-balance text-text-primary sm:text-4xl">
        {cours.titre}
      </h3>
      {cours.accroche && (
        <p className="max-w-[42ch] text-base leading-relaxed text-text-muted sm:text-lg">
          {cours.accroche}
        </p>
      )}
      <Link
        href={cours.href}
        className="mt-3 inline-flex items-center justify-center gap-2 rounded-sm bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {labels.cta}
        <IconArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );

  const contenu = (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-16">
      {blocCours}
      {textes.length > 0 && (
        <div className="flex min-w-0 flex-col gap-3.5">
          <span className="font-mono text-xs tracking-[0.2em] text-text-muted uppercase">
            {labels.textesEtudies}
          </span>
          <ul className="grid grid-cols-2 gap-2.5 sm:gap-4">
            {textes.map((texte, i) => (
              <li key={texte.id ?? i} className="flex min-w-0">
                <CarteOuvrage ouvrage={texte} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <section
      className={cx(
        "relative isolate overflow-hidden py-20 sm:py-28 lg:py-32",
        TON_CLASS[ton],
      )}
    >
      {imageFond && (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <Image
            src={imageFond.src}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-50"
          />
          {/* La bande apporte sa propre lisibilité : le fond reste plus
              présent autour d'elle, ce qui marque davantage la rupture avec
              les sections voisines. Le filet, lui, n'a que ce voile. */}
          {!bande && <div className={cx("absolute inset-0", VOILE_FILET[ton])} />}
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <h2 className="font-display text-3xl leading-[1.05] tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
          {labels.titre}
        </h2>
      </div>

      {bande ? (
        // Bord à bord : ni coins arrondis ni retrait latéral — c'est ce qui la
        // distingue d'une carte. Le contenu retrouve la largeur de page à
        // l'intérieur. Liserés clairs haut et bas pour détacher la bande du
        // fond sans l'encadrer.
        <div className="mt-8 border-y border-bg-raised/70 bg-bg-primary/60 py-8 backdrop-blur-md lg:mt-12 lg:py-11">
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">{contenu}</div>
        </div>
      ) : (
        <div className="mx-auto mt-8 w-full max-w-7xl px-5 sm:px-8 lg:mt-12">{contenu}</div>
      )}
    </section>
  );
}

/**
 * Carte d'un livre : zone d'image de hauteur fixe (couverture ou trame), puis
 * titre et auteur dessous — le seul niveau de carte de la section.
 *
 * La couverture est rendue en `mix-blend-multiply` : une photo de livre
 * détourée sur fond blanc voit ce blanc prendre la couleur de la carte, sans
 * retouche de l'image. D'où une carte **opaque**, même posée sur la bande
 * translucide : sur un fond transparent, le multiply composerait avec l'image
 * de fond de la section.
 */
function CarteOuvrage({ ouvrage }: { ouvrage: OuvrageApercu }) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-bg-secondary">
      <div className="relative h-38 p-3.5 sm:h-58">
        {ouvrage.couverture ? (
          <Image
            src={ouvrage.couverture.src}
            alt={ouvrage.couverture.alt || ouvrage.titre}
            width={ouvrage.couverture.width}
            height={ouvrage.couverture.height}
            sizes="(min-width: 1024px) 18rem, 45vw"
            className="h-full w-full object-contain mix-blend-multiply"
          />
        ) : (
          <Motif className="absolute inset-0 text-accent opacity-[0.12]" />
        )}
      </div>
      <div className="flex flex-col gap-1 px-3 pt-0.5 pb-3 sm:px-4.5 sm:pb-4.5">
        <h4 className="font-display text-[15px] leading-tight font-medium tracking-tight text-text-primary sm:text-lg">
          {ouvrage.titre}
        </h4>
        {ouvrage.precision && (
          <span className="font-mono text-[9px] tracking-[0.12em] text-text-muted uppercase sm:text-[10px] sm:tracking-[0.16em]">
            {ouvrage.precision}
          </span>
        )}
      </div>
    </div>
  );
}
