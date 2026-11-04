"use client";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SOLUTION « form → WhatsApp »  (extrait de MEDINE_INSTITUT, Next.js App Router)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Un formulaire de mise en relation qui **compose un message à la place du
 * visiteur** et l'ouvre pré-rempli dans WhatsApp (`https://wa.me/<numero>?text=`).
 * Aucun backend, aucune donnée envoyée ni stockée : RGPD-safe par construction.
 *
 * Remplace le CTA « WhatsApp vide » (le visiteur ne sait pas quoi écrire) par un
 * parcours guidé. Voir le README du dossier pour le câblage côté page serveur,
 * la liste des tokens de DA à remapper et ce qui reste spécifique au projet
 * d'origine (institut d'enseignement : domaines → matières → modules/cours).
 *
 * Ce fichier est volontairement **aplati** : icônes, helper `cx`, types et
 * libellés y sont inlinés pour rester lisible d'un seul tenant.
 */

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

/* ══ Utilitaires inlinés ═══════════════════════════════════════════════════ */

/** Concatène des classes en ignorant les valeurs falsy (mini-`clsx`). */
function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
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
      {children}
    </svg>
  );
}

const IconCheck = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.3l2.4 2.4 4.6-5" />
  </Svg>
);

const IconChevronLeft = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

const IconChevronRight = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);

const IconWhatsapp = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3.5 20.5l1.3-4.2A8.2 8.2 0 1112 20.2a8.4 8.4 0 01-4-1z" />
    <path d="M9 9.2c0 3 2 5 4.6 5.4.7.1 1.4-.4 1.4-1.1v-.6l-1.7-.8-.8.9a4.6 4.6 0 01-2.2-2.3l.9-.8-.8-1.7h-.6c-.5 0-.8.4-.8 1z" />
  </Svg>
);

/**
 * Visuel d'une carte de cours. Dans le projet d'origine il vient d'une requête
 * Payload dédiée (`getVisuelsModules`), volontairement séparée du catalogue
 * monté dans la navbar — ce catalogue-là est sérialisé dans le HTML de **toutes**
 * les pages, y verser des couvertures ferait payer à chacune une donnée qu'une
 * seule affiche.
 */
export type VisuelModule = {
  image: { src: string; width: number; height: number; alt: string } | null;
  niveau: "debutant" | "intermediaire" | "avance";
  visibilite: "gratuit" | "payant";
  professeur: string | null;
};

/* ══ Libellés ══════════════════════════════════════════════════════════════
 *
 * Dans le projet d'origine ils viennent du dictionnaire i18n
 * (`data/dictionaries/{fr,en}.json`), et l'en-tête de page + le gabarit du
 * message sont éditables depuis le CMS. Ici tout est inliné en un seul objet :
 * c'est le point d'entrée à réécrire pour un nouveau client.
 *
 * ⚠️ Le gabarit `message.*` est la pièce maîtresse : chaque ligne est une phrase
 * autonome avec ses variables `{}`. Une ligne dont la donnée est absente est
 * omise (voir `construireMessage`).
 */
export const LABELS_FR = {
  contact: {
    blocInteret: "Ce qui vous intéresse",
    blocPreferences: "Vos préférences",
    labelProgrammeComplet: "Programme complet",
    facultatif: "facultatif",
    champObligatoire: "* Champ obligatoire",
    domaineRequis:
      "Indiquez ce qui vous intéresse — ou choisissez « Je ne sais pas encore ».",
    conseilLabel: "Conseillez-moi",
    pasSurTitre: "Vous ne savez pas encore ?",
    selectionTitre: "Vous avez sélectionné",
    changerModule: "Changer",
    champDomaine: "Qu'est-ce qui vous intéresse ?",
    domaineConseil: "Je ne sais pas encore, conseillez-moi",
    champModule: "Quelle prestation vous intéresse ?",
    champGenre: "Les cours sont pour",
    genreHomme: "Un homme",
    genreFemme: "Une femme",
    genreRequis: "Veuillez indiquer le genre.",
    champPourQui: "Pour qui est-ce ?",
    pourQuiPlaceholder: "Choisir…",
    pourQuiRequis: "Veuillez indiquer pour qui c'est.",
    pourQui: {
      moi: "Pour moi-même",
      enfant: "Pour mon enfant",
      proche: "Pour un proche",
    },
    champFormat: "Format souhaité",
    formatPlaceholder: "Peu importe",
    format: {
      individuel: "Individuel",
      binome: "En binôme",
      groupe: "En petit groupe",
    },
    champNiveau: "Votre niveau",
    niveauPlaceholder: "Je ne sais pas encore",
    champPrenomKunya: "Prénom + Nom",
    prenomPlaceholder: "Comment doit-on vous appeler ?",
    prenomRequis:
      "Merci d'indiquer votre prénom pour qu'on puisse vous répondre.",
    champPrecisions: "Précisions",
    precisionsPlaceholder:
      "Ex : je suis disponible en soirée ou le week-end…",
    envoyer: "Envoyer sur WhatsApp",
    confirmEyebrow: "Message envoyé sur WhatsApp",
    confirmTitre: "WhatsApp s'est ouvert dans un nouvel onglet",
    confirmMessage:
      "Il ne vous reste qu'à appuyer sur envoyer. Si l'onglet ne s'est pas ouvert, ou si vous préférez nous écrire plus tard, votre message est conservé ci-dessous.",
    apercuLabel: "Votre message",
    ouvrirWhatsapp: "Rouvrir WhatsApp",
    modifier: "Modifier mes réponses",
    /** Gabarit du message WhatsApp — une ligne par information. */
    message: {
      salutation: "Bonjour,",
      presentation: "je m'appelle {prenom}.",
      interet: "Je suis intéressé(e) par : {enseignement}.",
      conseil:
        "Je ne sais pas encore quoi choisir, j'aimerais être conseillé(e).",
      module: "Prestation visée : {module}.",
      conseilNiveau:
        "J'aimerais que vous me conseilliez une formule adaptée à mon niveau.",
      pourQui: "{pourQui}.",
      public: "Public : {genre}.",
      format: "Format souhaité : {format}.",
      niveau: "Niveau : {niveau}.",
      precisions: "Précisions : {precisions}",
      cloture: "Pouvez-vous m'en dire plus ? Merci d'avance.",
    },
  },
  niveau: {
    debutant: "Débutant",
    intermediaire: "Intermédiaire",
    avance: "Avancé",
  },
  visibilite: { gratuit: "Gratuit" },
  common: { avecProfesseur: "avec" },
};

/** Forme attendue par le formulaire — dérivée des libellés par défaut. */
export type Dictionary = typeof LABELS_FR;


/**
 * Catalogue réduit au strict nécessaire du formulaire (slugs + libellés),
 * sérialisable pour passer du server component à ce composant client. Assemblé
 * dans `contact/page.tsx` à partir de `getDomainesAvecCatalogue`. `complet`
 * marque le module « programme complet » du domaine, traité à part.
 */
export type CatalogueContact = {
  slug: string;
  nom: string;
  matieres: {
    slug: string;
    nom: string;
    modules: {
      slug: string;
      titre: string;
      resume?: string;
      complet?: boolean;
      /**
       * Visuel de la carte, assemblé par la page contact à partir de
       * `getVisuelsModules`. Absent tant que le module n'est pas trouvé côté
       * requête : la carte retombe alors sur le placeholder de marque, comme
       * sur la page domaine.
       */
      visuel?: VisuelModule;
    }[];
  }[];
}[];

/** Visuel de repli quand un module n'a pas d'image : un asset de marque servi
    depuis `public/`. À remplacer par celui du nouveau projet. */
const PLACEHOLDER_COURS = "/placeholder-cours.png";

/** Valeur de domaine réservée à « Je ne sais pas encore, conseillez-moi ». */
const DOMAINE_CONSEIL = "__conseil";

/**
 * Valeur de module réservée à « je ne sais pas encore quel cours ».
 *
 * Volontairement **hors** de la galerie de cartes : qui ne sait pas ne va pas
 * chercher sa réponse dans une liste de cours, et qui sait ne veut pas
 * l'enjamber à chaque fois. C'est une sortie facultative posée après la
 * galerie, jamais une bifurcation imposée avant elle.
 */
const MODULE_CONSEIL = "__conseil-module";

/** Le domaine parent d'un module, pour le préremplissage par `?module=`. */
function domaineDuModule(catalogue: CatalogueContact, slug: string) {
  for (const d of catalogue) {
    for (const matiere of d.matieres) {
      if (matiere.modules.some((m) => m.slug === slug)) return d.slug;
    }
  }
  return null;
}

type Genre = "" | "homme" | "femme";

/**
 * Formulaire de mise en relation : au lieu d'ouvrir WhatsApp vide, il compose
 * un message clair à partir des réponses et l'ouvre pré-rempli (`wa.me`). Aucun
 * backend, aucune donnée envoyée ou stockée — tout se joue côté client.
 *
 * La soumission ouvre WhatsApp **directement** dans un nouvel onglet : la
 * relecture se fait dans le champ de saisie WhatsApp, une étape d'aperçu
 * intermédiaire serait redondante. L'onglet du site reste en arrière-plan et
 * affiche le message composé — filet de sécurité si l'ouverture est bloquée par
 * le navigateur, ou si WhatsApp Web réclame une connexion (cas desktop).
 *
 * Choix du cours : **un domaine, puis un cours, et c'est tout**. La version
 * précédente demandait d'abord de choisir *comment* choisir — une case
 * « conseillez-moi », un radio « programme complet », un radio « un cours
 * précis », puis deux interfaces différentes selon la taille d'écran. Trois
 * contrôles avant le vrai choix, et une distinction interne à l'offre
 * (programme complet / module) que le visiteur n'a aucune raison d'arbitrer.
 * `complet` reste une **donnée** qui range la carte en tête, jamais un concept
 * exposé.
 *
 * Seuls l'enseignement et le prénom sont obligatoires ; tout le reste est
 * facultatif (page de conversion : friction minimale).
 *
 * Le domaine et le module peuvent être pré-remplis par l'URL
 * (`?domaine=<slug>&module=<slug>`), ce qui permet au bouton « S'inscrire »
 * d'un cours d'arriver ici déjà positionné.
 */
export default function ContactForm({
  catalogue,
  dict = LABELS_FR,
  whatsappNumero,
}: {
  catalogue: CatalogueContact;
  /** Libellés + gabarit du message. Défaut : `LABELS_FR` (voir en tête). */
  dict?: Dictionary;
  /** Numéro WhatsApp au format international, chiffres uniquement (ex. `33612345678`). */
  whatsappNumero: string;
}) {
  const t = dict.contact;
  const params = useSearchParams();

  // Résolu une fois : localise le module passé en query (s'il existe) et son
  // domaine parent, pour dériver les trois états ci-dessous de façon cohérente.
  const moduleParam = params.get("module");
  const domaineDuParam = moduleParam ? domaineDuModule(catalogue, moduleParam) : null;

  // État initialisé une fois depuis l'URL : le domaine passé en query, sinon
  // celui qui contient le module passé en query (lien « S'inscrire » d'un cours
  // qui ne préciserait que le module).
  const [domaine, setDomaine] = useState<string>(() => {
    const d = params.get("domaine");
    if (d && catalogue.some((c) => c.slug === d)) return d;
    if (domaineDuParam) return domaineDuParam;
    return "";
  });
  // Slug du cours choisi, ou `MODULE_CONSEIL`. Le programme complet est un
  // slug comme un autre : plus aucun état parallèle ne le distingue.
  const [module, setModule] = useState<string>(() => (domaineDuParam ? moduleParam! : ""));
  /**
   * Rouvre la galerie sur un cours déjà choisi. La galerie se replie d'elle-même
   * à la sélection : sur un formulaire qui se parcourt verticalement, laisser
   * six cartes en travers du chemin fait retraverser un choix déjà fait à
   * chaque aller-retour — surtout en mobile. Repliée, elle rappelle en une
   * ligne ce qui est sélectionné, ce qu'aucune liste ouverte ne fait aussi bien.
   */
  const [modifierModule, setModifierModule] = useState<boolean>(false);
  const [genre, setGenre] = useState<Genre>("");
  const [pourQui, setPourQui] = useState<string>("");
  const [format, setFormat] = useState<string>("");
  const [niveau, setNiveau] = useState<string>("");
  const [prenom, setPrenom] = useState<string>("");
  const [precisions, setPrecisions] = useState<string>("");
  const [erreurDomaine, setErreurDomaine] = useState<boolean>(false);
  const [erreurGenre, setErreurGenre] = useState<boolean>(false);
  const [erreurPourQui, setErreurPourQui] = useState<boolean>(false);
  const [erreurPrenom, setErreurPrenom] = useState<boolean>(false);
  const [envoye, setEnvoye] = useState<boolean>(false);
  const recapRef = useRef<HTMLDivElement>(null);

  const domaineActif =
    domaine && domaine !== DOMAINE_CONSEIL
      ? catalogue.find((c) => c.slug === domaine)
      : undefined;

  /**
   * Tous les cours du domaine à plat, le programme complet en tête.
   *
   * Le surtitre porte la matière — « Tome 1 » ou « Al Ajroumiyya » ne veulent
   * rien dire hors contexte, et à plat plus aucun séparateur ne le donne. Le
   * programme complet, lui, prend un libellé : sa matière d'origine
   * (« Tomes de Médine ») induirait en erreur sur un cursus qui les couvre
   * toutes.
   */
  const modulesDuDomaine = (domaineActif?.matieres ?? [])
    .flatMap((m) => m.modules.map((mod) => ({ ...mod, matiere: m.nom })))
    .sort((a, b) => Number(!!b.complet) - Number(!!a.complet));

  const moduleChoisi = modulesDuDomaine.find((mod) => mod.slug === module);
  /* Repliée dès qu'un choix est fait, sauf demande explicite de le revoir. */
  const galerieOuverte = !module || modifierModule;

  function choisirDomaine(slug: string) {
    setDomaine(slug);
    setModule("");
    setModifierModule(false);
    if (erreurDomaine) setErreurDomaine(false);
  }

  function choisirModule(slug: string) {
    setModule(slug);
    setModifierModule(false);
  }

  function construireMessage(): string {
    const m = t.message;
    const nomDomaine = domaineActif?.nom ?? "";

    const lignes: string[] = [
      `${m.salutation} ${m.presentation.replace("{prenom}", prenom.trim())}`,
    ];

    if (domaine === DOMAINE_CONSEIL) {
      lignes.push(m.conseil);
    } else if (nomDomaine) {
      lignes.push(m.interet.replace("{enseignement}", nomDomaine));
    }

    // « Conseillez-moi » est une demande explicite : la taire la rendrait
    // implicite côté destinataire. Un domaine sans cours choisi reste muet en
    // revanche — la ligne « intéressé par {domaine} » le dit déjà.
    if (domaineActif) {
      if (module === MODULE_CONSEIL) {
        lignes.push(m.conseilNiveau);
      } else if (moduleChoisi) {
        lignes.push(m.module.replace("{module}", moduleChoisi.titre));
      }
    }
    if (pourQui) {
      lignes.push(
        m.pourQui.replace(
          "{pourQui}",
          t.pourQui[pourQui as keyof typeof t.pourQui],
        ),
      );
    }
    if (genre) {
      const label = genre === "homme" ? t.genreHomme : t.genreFemme;
      lignes.push(m.public.replace("{genre}", label));
    }
    if (format) {
      lignes.push(
        m.format.replace("{format}", t.format[format as keyof typeof t.format]),
      );
    }
    if (niveau) {
      lignes.push(
        m.niveau.replace(
          "{niveau}",
          dict.niveau[niveau as keyof typeof dict.niveau],
        ),
      );
    }
    if (precisions.trim()) {
      lignes.push(m.precisions.replace("{precisions}", precisions.trim()));
    }
    lignes.push("", m.cloture);

    return lignes.join("\n");
  }

  // Recalculé à chaque rendu (et non au seul moment de l'envoi) : le lien doit
  // être prêt de façon synchrone dans le gestionnaire de soumission, sinon
  // l'ouverture de WhatsApp sortirait du geste utilisateur et serait bloquée.
  const messagePret = construireMessage();
  const lienWhatsapp = `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(messagePret)}`;

  /**
   * Le passage à l'écran de récapitulatif remplace un formulaire très haut par
   * une carte courte : la hauteur du document s'effondre et le navigateur
   * recadre le défilement de lui-même — recadrage *animé*, puisque
   * `globals.css` pose `scroll-behavior: smooth` sur `html`. L'utilisateur
   * voyait donc la page glisser seule vers une position arbitraire.
   *
   * On reprend la main avant le paint (`useLayoutEffect`) et sans animation :
   * la carte est en place dès la première image, aucun glissement visible.
   */
  useLayoutEffect(() => {
    if (!envoye) return;
    recapRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [envoye]);

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    let ok = true;
    if (!domaine) {
      setErreurDomaine(true);
      ok = false;
    }
    if (!genre) {
      setErreurGenre(true);
      ok = false;
    }
    if (!pourQui) {
      setErreurPourQui(true);
      ok = false;
    }
    if (!prenom.trim()) {
      setErreurPrenom(true);
      ok = false;
    }
    if (!ok) return;
    // Appel synchrone dans le geste de soumission : condition pour que le
    // navigateur ne traite pas l'ouverture comme une pop-up intempestive. Si
    // elle est tout de même bloquée, le récapitulatif ci-dessous garde le lien.
    window.open(lienWhatsapp, "_blank", "noopener");
    setEnvoye(true);
  }

  // ── Récapitulatif : WhatsApp est déjà ouvert, on garde le message sous la main ─
  if (envoye) {
    return (
      <div
        ref={recapRef}
        className="rounded-xl border border-border-subtle bg-bg-raised p-8 text-center sm:p-12"
      >
        <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-accent">
          {t.confirmEyebrow}
        </span>
        <h2 className="mt-3 font-display text-3xl leading-tight text-text-primary sm:text-4xl">
          {t.confirmTitre}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-text-muted">
          {t.confirmMessage}
        </p>

        <div className="mt-8 text-left">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
            {t.apercuLabel}
          </span>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-bg-secondary p-5 font-sans text-sm leading-relaxed text-text-primary">
            {messagePret}
          </pre>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={lienWhatsapp}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-accent px-6 py-3.5 text-base font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <IconWhatsapp className="h-5 w-5" />
            {t.ouvrirWhatsapp}
          </a>
          <button
            type="button"
            onClick={() => setEnvoye(false)}
            className="inline-flex items-center justify-center rounded-sm px-6 py-3.5 text-base font-semibold text-text-muted transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t.modifier}
          </button>
        </div>
      </div>
    );
  }

  // ── Formulaire ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={soumettre}>
      {/* Bloc 1 — enseignement puis cours. */}
      <div>
        <EtapeTitre numero={1} titre={t.blocInteret} />

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-text-primary">
            {t.champDomaine}
            <Astérisque />
          </legend>
          <div
            className="mt-3 flex flex-wrap gap-2.5"
            role="radiogroup"
            aria-label={t.champDomaine}
          >
            {catalogue.map((d) => (
              <PillRadio
                key={d.slug}
                name="domaine"
                value={d.slug}
                checked={domaine === d.slug}
                onChange={() => choisirDomaine(d.slug)}
              >
                {d.nom}
              </PillRadio>
            ))}
            <PillRadio
              name="domaine"
              value={DOMAINE_CONSEIL}
              checked={domaine === DOMAINE_CONSEIL}
              onChange={() => choisirDomaine(DOMAINE_CONSEIL)}
            >
              {t.domaineConseil}
            </PillRadio>
          </div>
          {erreurDomaine && (
            <span role="alert" className="mt-2 block text-sm text-accent-warm">
              {t.domaineRequis}
            </span>
          )}
        </fieldset>

        {domaineActif && modulesDuDomaine.length > 0 && (
          /*
           * ⚠️ `min-w-0` obligatoire : un `<fieldset>` a `min-width: min-content`
           * par défaut dans tous les navigateurs, et ignore donc la largeur de
           * son parent. Sans ça, la galerie ne défile pas — c'est le fieldset
           * qui s'étire à la largeur cumulée des cartes et fait déborder la
           * page entière (mesuré : 3695 px de large pour un viewport de 390).
           */
          <fieldset className="mt-8 min-w-0">
            <legend className="text-sm font-semibold text-text-primary">
              {t.champModule}
              <span className="ml-1.5 font-normal text-text-muted">({t.facultatif})</span>
            </legend>

            {galerieOuverte ? (
              <>
                <GalerieModules
                  modules={modulesDuDomaine}
                  valeur={module}
                  dict={dict}
                  labelComplet={t.labelProgrammeComplet}
                  ariaLabel={t.champModule}
                  onSelect={choisirModule}
                />

                {/*
                 * Sortie facultative, posée APRÈS la galerie et formulée en
                 * question : elle se laisse ignorer sans être lue par qui sait
                 * déjà ce qu'il veut, et reste trouvable par qui ne sait pas.
                 * En faire une carte l'aurait mise sur le chemin de tout le
                 * monde tout en la cachant à ceux qui en ont besoin — ils ne
                 * cherchent pas leur réponse dans une liste de cours.
                 */}
                <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className="text-text-muted">{t.pasSurTitre}</span>
                  <button
                    type="button"
                    onClick={() => choisirModule(MODULE_CONSEIL)}
                    className="rounded-sm font-semibold text-accent underline underline-offset-4 transition-colors hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {t.conseilLabel}
                  </button>
                </div>
              </>
            ) : (
              /*
               * Récapitulatif de sélection, dans l'esprit d'un panier : on y
               * revoit **la carte même** qu'on vient de choisir, pas une ligne
               * de texte qui la résume. C'est ce qui rend le choix lisible sans
               * effort à l'arrivée depuis la fiche d'un cours (`?module=`), où
               * la sélection est faite d'avance et où rien, sinon, ne dit ce
               * qui est retenu.
               *
               * Le fond accent est porté par **le bloc**, jamais par la carte :
               * c'est ce qui dit « ceci est votre sélection » sans salir le
               * visuel du cours (un aplat posé sur une photo la ternit), et
               * c'est ce qui permet à la sortie « conseillez-moi », qui n'a pas
               * de carte à montrer, d'habiter exactement la même boîte.
               */
              <div className="mt-3 rounded-lg bg-accent-soft p-4 sm:p-5">
                <span className="flex items-center gap-2 text-sm font-semibold text-accent">
                  <IconCheck className="h-4 w-4 shrink-0" />
                  {t.selectionTitre}
                  {!moduleChoisi && (
                    <span className="text-text-primary">— {t.conseilLabel}</span>
                  )}
                </span>

                <div className="mt-3 flex flex-wrap items-stretch gap-4">
                  {moduleChoisi && (
                    <div className="w-[52%] max-w-[13rem] shrink-0 sm:w-52">
                      <VisuelCarte
                        module={moduleChoisi}
                        dict={dict}
                        labelComplet={t.labelProgrammeComplet}
                        choisi={false}
                        taille="recap"
                      />
                    </div>
                  )}
                  {/*
                   * La colonne de droite ne redit pas ce que la carte porte
                   * déjà (titre, matière, professeur, niveau) : elle ajoute
                   * l'accroche du cours, seul contenu éditorial qui ne tient
                   * pas sur la vignette, et referme le bloc par l'action.
                   */}
                  <div className="flex min-w-[9rem] flex-1 flex-col justify-between gap-3">
                    {/* Rien d'inventé pour « conseillez-moi » : sans cours
                        choisi il n'y a pas d'accroche à montrer, et le titre du
                        bloc dit déjà tout. */}
                    {moduleChoisi?.resume && (
                      <p className="line-clamp-4 text-sm leading-relaxed text-text-muted">
                        {moduleChoisi.resume}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setModifierModule(true)}
                      className="self-start rounded-sm border border-border-strong bg-bg-raised px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {t.changerModule}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </fieldset>
        )}
      </div>

      {/* Bloc 2 — préférences. Filet de séparation borné à la largeur du form. */}
      <div className="mt-10 border-t border-border-subtle pt-10">
        <EtapeTitre numero={2} titre={t.blocPreferences} />

        <div className="mt-6 grid gap-8">
          <fieldset>
            <legend className="text-sm font-semibold text-text-primary">
              {t.champGenre}
              <Astérisque />
            </legend>
            <div
              className="mt-3 flex flex-wrap gap-2.5"
              role="radiogroup"
              aria-label={t.champGenre}
            >
              <PillRadio
                name="genre"
                value="homme"
                checked={genre === "homme"}
                onChange={() => {
                  setGenre("homme");
                  if (erreurGenre) setErreurGenre(false);
                }}
              >
                {t.genreHomme}
              </PillRadio>
              <PillRadio
                name="genre"
                value="femme"
                checked={genre === "femme"}
                onChange={() => {
                  setGenre("femme");
                  if (erreurGenre) setErreurGenre(false);
                }}
              >
                {t.genreFemme}
              </PillRadio>
            </div>
            {erreurGenre && (
              <span role="alert" className="mt-2 block text-sm text-accent-warm">
                {t.genreRequis}
              </span>
            )}
          </fieldset>

          <div className="grid gap-6 sm:grid-cols-2">
            <Champ label={t.champPourQui} requis>
              <select
                value={pourQui}
                onChange={(e) => {
                  setPourQui(e.target.value);
                  if (erreurPourQui) setErreurPourQui(false);
                }}
                aria-invalid={erreurPourQui}
                className={cx(
                  SELECT_CLASS,
                  erreurPourQui && "border-accent-warm",
                )}
              >
                <option value="">{t.pourQuiPlaceholder}</option>
                <option value="moi">{t.pourQui.moi}</option>
                <option value="enfant">{t.pourQui.enfant}</option>
                <option value="proche">{t.pourQui.proche}</option>
              </select>
              {erreurPourQui && (
                <span
                  role="alert"
                  className="mt-1 block text-sm text-accent-warm"
                >
                  {t.pourQuiRequis}
                </span>
              )}
            </Champ>

            <Champ label={t.champFormat} optionnelLabel={t.facultatif}>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">{t.formatPlaceholder}</option>
                <option value="individuel">{t.format.individuel}</option>
                <option value="binome">{t.format.binome}</option>
                <option value="groupe">{t.format.groupe}</option>
              </select>
            </Champ>

            <Champ label={t.champNiveau} optionnelLabel={t.facultatif}>
              <select
                value={niveau}
                onChange={(e) => setNiveau(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">{t.niveauPlaceholder}</option>
                <option value="debutant">{dict.niveau.debutant}</option>
                <option value="intermediaire">
                  {dict.niveau.intermediaire}
                </option>
                <option value="avance">{dict.niveau.avance}</option>
              </select>
            </Champ>

            <Champ label={t.champPrenomKunya} requis>
              <input
                type="text"
                value={prenom}
                onChange={(e) => {
                  setPrenom(e.target.value);
                  if (erreurPrenom) setErreurPrenom(false);
                }}
                placeholder={t.prenomPlaceholder}
                aria-invalid={erreurPrenom}
                className={cx(
                  SELECT_CLASS,
                  erreurPrenom && "border-accent-warm",
                )}
              />
              {erreurPrenom && (
                <span
                  role="alert"
                  className="mt-1 block text-sm text-accent-warm"
                >
                  {t.prenomRequis}
                </span>
              )}
            </Champ>
          </div>

          <Champ label={t.champPrecisions} optionnelLabel={t.facultatif}>
            <textarea
              value={precisions}
              onChange={(e) => setPrecisions(e.target.value)}
              placeholder={t.precisionsPlaceholder}
              rows={4}
              className={cx(SELECT_CLASS, "resize-y")}
            />
          </Champ>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-accent px-8 py-4 text-base font-semibold text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <IconWhatsapp className="h-5 w-5" />
          {t.envoyer}
        </button>
        <span className="text-xs text-text-muted">{t.champObligatoire}</span>
      </div>
    </form>
  );
}

/** Classe commune aux champs texte / select : surface crème bordée, DA-compatible. */
const SELECT_CLASS =
  "w-full rounded-sm border border-border-subtle bg-bg-raised px-4 py-3 text-base text-text-primary transition-colors focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Astérisque « champ obligatoire ». */
function Astérisque() {
  return (
    <span aria-hidden className="ml-0.5 text-accent-warm">
      *
    </span>
  );
}

/** Intitulé d'étape : numéro dans une pastille accent + titre. */
function EtapeTitre({ numero, titre }: { numero: number; titre: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm text-accent-foreground">
        {numero}
      </span>
      <h2 className="font-display text-xl text-text-primary sm:text-2xl">
        {titre}
      </h2>
    </div>
  );
}

/**
 * Libellé + champ, structure commune des champs classiques. `requis` ajoute un
 * astérisque, `optionnelLabel` affiche « (facultatif) » — jamais les deux.
 */
function Champ({
  label,
  requis,
  optionnelLabel,
  children,
}: {
  label: string;
  requis?: boolean;
  optionnelLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-text-primary">
        {label}
        {requis && <Astérisque />}
        {optionnelLabel && (
          <span className="ml-1.5 font-normal text-text-muted">
            ({optionnelLabel})
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

/**
 * Choix unique sous forme de pill. Radio réel masqué (`sr-only`) pour garder
 * la sémantique et la navigation clavier ; l'état sélectionné est stylé sur le
 * label parent.
 */
function PillRadio({
  name,
  value,
  checked,
  onChange,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cx(
        "cursor-pointer rounded-sm border px-4 py-2.5 text-sm font-medium transition-colors",
        checked
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border-subtle bg-bg-raised text-text-primary hover:border-border-strong",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {children}
    </label>
  );
}

/** Un cours tel que la galerie l'affiche : sa carte, sa matière, son visuel. */
type ModuleGalerie = {
  slug: string;
  titre: string;
  matiere: string;
  complet?: boolean;
  visuel?: VisuelModule;
};

/**
 * Galerie horizontale des cours d'un domaine.
 *
 * Le défilement horizontal a été préféré à une grille qui passe à la ligne
 * pour une raison de **parcours**, pas de compacité : ce sélecteur est une
 * étape sur un formulaire qu'on parcourt verticalement, et une grille de six
 * cartes reste en travers du chemin à chaque aller-retour, mobile en tête. La
 * galerie, elle, est bornée en hauteur — et elle disparaît une fois le choix
 * fait (voir `modifierModule`).
 *
 * Trois affordances de défilement, parce qu'une seule ne suffit jamais :
 *
 * 1. **La carte coupée au bord.** C'est le signal décisif : les cartes ne
 *    remplissent jamais la rangée (`basis` < 100 % / 50 % / 33 %), donc la
 *    suivante dépasse toujours. Une rangée qui tombe juste ne se lit pas comme
 *    défilable.
 * 2. **Le fondu aux extrémités**, en `mask-image` et non en dégradé de
 *    couleur : le masque agit sur l'opacité des cartes elles-mêmes, il ne
 *    suppose donc rien du fond de la bande (`sable` ici, autre ailleurs) et
 *    n'ajoute aucune exception à la règle « pas de dégradés » de la DA. Il
 *    n'apparaît que du côté où il reste effectivement à défiler.
 * 3. **Les flèches**, au pointeur fin seulement. `aria-hidden` + `tabIndex=-1`
 *    volontairement : les cartes sont de vrais boutons radio, donc les flèches
 *    du clavier y naviguent déjà nativement et amènent le focus dans le champ
 *    de vision. Les exposer une seconde fois ne ferait que doubler les arrêts
 *    de tabulation.
 *
 * ⚠️ Ces trois affordances se calculent sur des mesures de défilement, et
 * `onScroll` **ne suffit pas à les établir** : tant que rien n'a défilé, aucun
 * événement n'est émis. Sans la mesure au montage ci-dessous, une galerie qui
 * tient entière dans la rangée gardait sa flèche droite allumée à vie — elle
 * annonçait une suite qui n'existe pas.
 */
function GalerieModules({
  modules,
  valeur,
  dict,
  labelComplet,
  ariaLabel,
  onSelect,
}: {
  modules: ModuleGalerie[];
  valeur: string;
  dict: Dictionary;
  labelComplet: string;
  ariaLabel: string;
  onSelect: (slug: string) => void;
}) {
  const pisteRef = useRef<HTMLDivElement>(null);
  const [aGauche, setAGauche] = useState(false);
  const [aDroite, setADroite] = useState(false);

  /** Met à jour les fondus et les flèches. Marge d'un pixel : les positions de
   *  défilement sont fractionnaires, une comparaison stricte laisserait un
   *  fondu allumé en bout de course. */
  function majBords(piste: HTMLDivElement) {
    setAGauche(piste.scrollLeft > 1);
    setADroite(piste.scrollLeft + piste.clientWidth < piste.scrollWidth - 1);
  }

  /**
   * Deux choses à l'ouverture de la galerie, avant peinture :
   *
   * 1. **Ramener le cours déjà choisi dans le champ de vision.** La galerie est
   *    démontée quand elle se replie : sans ça, « Changer » la rouvre au début
   *    de la piste et le cours sélectionné, s'il était au-delà des premières
   *    cartes, n'est plus visible — on doit re-défiler pour retrouver ce qu'on
   *    avait déjà choisi. Vaut aussi à l'arrivée depuis la fiche d'un cours
   *    (`?module=`), où la carte présélectionnée doit être la première vue.
   *    Le défilement est posé **directement sur la piste** plutôt que par
   *    `scrollIntoView`, qui remonterait aussi les ancêtres et ferait sauter la
   *    page verticalement.
   * 2. **Mesurer.** Le montage n'émet pas d'événement de défilement, et un
   *    redimensionnement (rotation, ouverture du clavier virtuel) change le
   *    verdict sans en émettre non plus — d'où le `ResizeObserver`.
   */
  useLayoutEffect(() => {
    const piste = pisteRef.current;
    if (!piste) return;

    const carte = piste.querySelector<HTMLElement>("[data-choisi='true']");
    if (carte) {
      piste.scrollLeft = carte.offsetLeft - (piste.clientWidth - carte.offsetWidth) / 2;
    }
    majBords(piste);

    const observateur = new ResizeObserver(() => majBords(piste));
    observateur.observe(piste);
    return () => observateur.disconnect();
  }, [modules]);

  function defiler(sens: 1 | -1) {
    const piste = pisteRef.current;
    if (!piste) return;
    piste.scrollBy({ left: sens * piste.clientWidth * 0.8, behavior: "smooth" });
  }

  const fondu =
    aGauche && aDroite
      ? "[mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-1rem),transparent)]"
      : aGauche
        ? "[mask-image:linear-gradient(to_right,transparent,black_1rem)]"
        : aDroite
          ? "[mask-image:linear-gradient(to_right,black_calc(100%-1rem),transparent)]"
          : "";

  return (
    <div className="relative mt-4">
      <div
        ref={pisteRef}
        role="radiogroup"
        aria-label={ariaLabel}
        onScroll={(e) => majBords(e.currentTarget)}
        className={cx(
          // `p-1` + `scroll-p-1` : le contour de sélection et celui du focus
          // débordent de la carte, sans cette marge ils seraient rognés par le
          // scroller sur les cartes de bout de piste.
          "flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-p-1 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          fondu,
        )}
      >
        {modules.map((mod) => (
          <CarteModule
            key={mod.slug}
            module={mod}
            dict={dict}
            labelComplet={labelComplet}
            checked={valeur === mod.slug}
            onChange={() => onSelect(mod.slug)}
          />
        ))}
      </div>

      {/*
        Desktop seulement, et par un point de rupture de **largeur**, pas par
        `(hover: hover)` : la requête média aurait dû battre `hidden` à
        spécificité égale, donc dépendre de l'ordre du CSS généré — le projet
        n'a pas `tailwind-merge` pour trancher. Au tactile, le geste de
        défilement suffit de toute façon.
      */}
      {[-1, 1].map((sens) => {
        const actif = sens === -1 ? aGauche : aDroite;
        return (
          <button
            key={sens}
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => defiler(sens as 1 | -1)}
            className={cx(
              "absolute top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong bg-bg-raised text-text-primary shadow-feuille-fort transition-opacity lg:flex",
              sens === -1 ? "-left-3" : "-right-3",
              actif ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {sens === -1 ? (
              <IconChevronLeft className="h-4 w-4" />
            ) : (
              <IconChevronRight className="h-4 w-4" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Carte d'un cours — **la même carte média que la page domaine**, en portrait,
 * l'image du cours occupant tout le fond et le texte ramassé en bas sur un
 * dégradé court (voir `ModuleCard` et la DA).
 *
 * Ce n'est pas `ModuleCard` réutilisé mais son traitement visuel reproduit :
 * cette carte-là est un **bouton radio**, quand `ModuleCard` est un lien plein
 * cadre vers la fiche du cours, doublé d'un bouton « S'inscrire ». Ces deux
 * cibles de clic n'ont aucun sens dans un formulaire — et un `<a>` ne peut de
 * toute façon pas vivre dans un `<label>` cliquable.
 *
 * Le choix de montrer un visuel ici est délibéré : cette étape est le moment
 * où l'on finalise son inscription, on veut **voir ce qu'on prend**. Aucun
 * module n'a de couverture chargée à ce jour, le repli de marque
 * (`placeholder-cours.png`) tient donc l'affiche en attendant, exactement
 * comme sur la page domaine.
 *
 * Les proportions (`basis`) sont ce qui fait dépasser la carte suivante hors
 * du cadre — c'est l'affordance principale du défilement, pas un réglage
 * esthétique : ne pas les arrondir à 100 / 50 / 33 %.
 */
function CarteModule({
  module,
  dict,
  labelComplet,
  checked,
  onChange,
}: {
  module: ModuleGalerie;
  dict: Dictionary;
  labelComplet: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      data-choisi={checked}
      className={cx(
        // `relative` n'est pas décoratif : le radio est `sr-only`, donc
        // `position: absolute`. Sans bloc conteneur sur le label, il s'ancre au
        // wrapper situé AU-DESSUS du scroller — et un absolu dont le bloc
        // conteneur est un ancêtre du scroller n'est pas rogné par lui. Les six
        // radios se retrouvaient alors posés jusqu'à ~1500 px et étiraient la
        // largeur du document entier (mesuré : 1357 px pour un viewport de 390,
        // soit un défilement horizontal parasite de toute la page, invisible
        // puisque les cartes, elles, étaient bien rognées).
        //
        // `has-[:focus-visible]` : le radio étant invisible, sans lui la
        // navigation au clavier dans le groupe ne montrerait strictement rien.
        // `min-w-0` : sans lui, `min-width: auto` plante un plancher à la
        // largeur **min-content** de la carte — et le nom du professeur est en
        // `truncate`, donc insécable, donc large. Les cartes dont le professeur
        // a un nom long s'élargissaient au-delà de leur base (mesuré : 235 px
        // contre 188 pour « Al Ajroumiyya »), et le rapport 3/4 les rendait du
        // même coup plus hautes. Même famille de piège que le `min-w-0` du
        // `<fieldset>` plus haut.
        "relative min-w-0 shrink-0 basis-[62%] cursor-pointer snap-start sm:basis-[38%] lg:basis-[31%]",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
      )}
    >
      <input
        type="radio"
        name="module"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <VisuelCarte module={module} dict={dict} labelComplet={labelComplet} choisi={checked} />
    </label>
  );
}

/**
 * Le rendu visuel de la carte, sans le radio : partagé entre la galerie et le
 * récapitulatif de sélection, qui doit montrer **la même carte** que celle
 * qu'on vient de choisir — c'est tout l'intérêt du récapitulatif.
 *
 * L'état choisi ne teinte **pas** la carte : un aplat accent posé par-dessus
 * une photo la salit et se lit mal. Il se dit par un contour accent et une
 * pastille cochée, la convention du panier — deux marques qui vivent au-dessus
 * de l'image sans la masquer.
 */
function VisuelCarte({
  module,
  dict,
  labelComplet,
  choisi,
  taille = "galerie",
}: {
  module: ModuleGalerie;
  dict: Dictionary;
  labelComplet: string;
  choisi: boolean;
  taille?: "galerie" | "recap";
}) {
  const visuel = module.visuel;
  const surtitre = module.complet ? labelComplet : module.matiere;
  const sizes =
    taille === "recap"
      ? "13rem"
      : "(min-width: 1024px) 14rem, (min-width: 640px) 18rem, 62vw";

  return (
    <div
      className={cx(
        "group/card relative isolate flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-lg shadow-feuille transition-shadow",
        choisi && "outline-2 outline-offset-2 outline-accent",
      )}
    >
      {/* Fond plein cadre : la couverture du cours, ou le logo de l'institut
          en repli — jamais un aplat nu. Voile uniforme par-dessus pour que
          l'image ne soit jamais en pleine opacité. */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {visuel?.image ? (
          <Image
            src={visuel.image.src}
            alt=""
            width={visuel.image.width}
            height={visuel.image.height}
            sizes={sizes}
            className="h-full w-full object-cover"
          />
        ) : (
          <Image src={PLACEHOLDER_COURS} alt="" fill sizes={sizes} className="object-cover" />
        )}
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-scrim/25" />
      {/* Voile de lisibilité confiné au bas de la carte (~55 %), comme sur la
          page domaine : court et franc, pour que le contraste du texte ne
          dépende pas de la couverture. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 top-[45%] -z-10 bg-gradient-to-t from-scrim/95 via-scrim/55 to-transparent"
      />

      {/* Pastille de sélection, dans le coin haut : c'est le repère qu'on
          cherche des yeux dans une rangée, et il reste lisible sur l'image. */}
      {choisi && (
        <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <IconCheck className="h-4 w-4" />
        </span>
      )}

      <div className="flex flex-col gap-1.5 p-4">
        <span
          className={cx(
            "truncate font-mono text-[10px] uppercase tracking-[0.16em]",
            module.complet ? "text-on-media" : "text-on-media/70",
          )}
        >
          {surtitre}
        </span>
        <span className="line-clamp-2 font-display text-lg leading-snug text-on-media">
          {module.titre}
        </span>
        {visuel?.professeur && (
          <span className="truncate text-xs text-on-media/75">
            {dict.common.avecProfesseur} {visuel.professeur}
          </span>
        )}
        {visuel && (
          <span className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-on-media/15 px-2 py-0.5 text-[10px] font-medium text-on-media backdrop-blur-sm">
              {dict.niveau[visuel.niveau]}
            </span>
            {visuel.visibilite === "gratuit" && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent-foreground">
                {dict.visibilite.gratuit}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

/* ══ Helpers de liens (origine : `lib/contact.ts`) ══════════════════════════
 *
 * Ce sont eux qui font entrer les visiteurs dans le formulaire déjà positionné :
 * un bouton « S'inscrire » sur la fiche d'un produit pointe vers
 * `/{lang}/contact?domaine=<slug>&module=<slug>`, que `ContactForm` relit au
 * montage via `useSearchParams`.
 */

/**
 * Lien `wa.me` direct (bulle flottante, footer, navbar) — le CTA « WhatsApp
 * vide » que le formulaire vient justement remplacer sur les pages de
 * conversion. `wa.me` gère lui-même la redirection appli/web selon l'appareil :
 * pas de détection mobile/desktop à faire ici.
 */
export function buildWhatsappHref(numero: string, texte?: string): string {
  const numeroPropre = numero.replace(/\D/g, "");
  const base = `https://wa.me/${numeroPropre}`;
  return texte ? `${base}?text=${encodeURIComponent(texte)}` : base;
}

/**
 * Lien vers le formulaire, préempli par query params quand un domaine et/ou un
 * module sont connus. `lang` est le segment de locale du projet d'origine —
 * à retirer sur un projet monolingue.
 */
export function buildContactHref(
  lang: string,
  options: { domaine?: string; module?: string } = {},
): string {
  const params = new URLSearchParams();
  if (options.domaine) params.set("domaine", options.domaine);
  if (options.module) params.set("module", options.module);
  const query = params.toString();
  return `/${lang}/contact${query ? `?${query}` : ""}`;
}
