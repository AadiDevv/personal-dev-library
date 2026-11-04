"use client";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SOLUTION « retours des visiteurs »  (extrait de MEDINE_INSTITUT, Next.js App Router)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Un bouton présent sur toutes les pages pour signaler un souci, donner une
 * idée, un besoin, une critique, avec captures d'écran, et **le contexte relevé
 * tout seul** (page, section à l'écran, pages vues avant, appareil, erreurs de
 * la page). À certains moments, une bulle avec croix invite à s'en servir.
 *
 * ## Interface (tout ce qu'un appelant doit savoir)
 *
 * ```tsx
 * <RetoursVisiteurs
 *   variante="pilule-repliable"   // le point d'entrée, voir VARIANTES
 *   envoyer={envoyerRetour}        // Server Action : (FormData) => Promise<ResultatRetour>
 *   whatsapp="https://wa.me/33…"   // facultatif : les variantes qui l'affichent le fusionnent
 * />
 * ```
 *
 * Facultatifs : `textes` (défauts en français ci-dessous), `regles` (durées des
 * bulles), `nouveautes` (rubriques qui ont leur bulle « C'est nouveau »),
 * `masquerWhatsappSur` (chemins où la moitié WhatsApp disparaît).
 * Ailleurs dans le site : `ouvrirRetour({ origine: "page404", type: "neMarchePas" })`
 * ouvre le formulaire (ligne « Vous cherchiez quelque chose ? » d'une 404).
 *
 * ## Les variantes : une seule prop, un seul code
 *
 * Toutes partagent le formulaire, les bulles, le relevé du contexte et le
 * panneau (ancré sur ordinateur, tiroir sur téléphone). Seul le point d'entrée
 * change : chaque variante est un petit adaptateur `PointEntree` (plus bas),
 * interne au module. Comparatif et choix dans le README du dossier.
 *
 * ## Dépendances
 *
 * `radix-ui` (Popover), `vaul` (Drawer), Tailwind v4 avec les tokens listés
 * dans le README. Icônes, `cx`, mise en valeur `**…**` et zone de dépôt sont
 * aplatis ici.
 */

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Popover } from "radix-ui";
import { Drawer } from "vaul";

/* ══ Utilitaires inlinés ═══════════════════════════════════════════════════ */

function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Suit une media query ; `false` au rendu serveur et au premier rendu client. */
function useMedia(requete: string): boolean {
  return useSyncExternalStore(
    (prevenir) => {
      const m = window.matchMedia(requete);
      m.addEventListener("change", prevenir);
      return () => m.removeEventListener("change", prevenir);
    },
    () => window.matchMedia(requete).matches,
    () => false,
  );
}

/** Met en valeur ce qui est entre `**` (gras + couleur d'accent chaude). Un `**` orphelin reste affiché tel quel. */
function emphase(texte: string): React.ReactNode[] {
  const m = texte.split("**");
  if (m.length % 2 === 0) {
    const orphelin = m.pop() as string;
    m[m.length - 1] += `**${orphelin}`;
  }
  return m.map((x, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold text-accent-warm-texte">{x}</strong> : x));
}

type IconProps = { className?: string };
function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}
const IconAvis = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M13 8H7M17 12H7" />
  </Svg>
);
const IconWhatsapp = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3.5 20.5l1.3-4.2A8.2 8.2 0 1112 20.2a8.4 8.4 0 01-4-1z" />
    <path d="M9 9.2c0 3 2 5 4.6 5.4.7.1 1.4-.4 1.4-1.1v-.6l-1.7-.8-.8.9a4.6 4.6 0 01-2.2-2.3l.9-.8-.8-1.7h-.6c-.5 0-.8.4-.8 1z" />
  </Svg>
);
const IconClose = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
const IconCheck = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.3l2.4 2.4 4.6-5" />
  </Svg>
);
const IconTeleverser = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </Svg>
);

/* ══ Types et constantes partagés avec le serveur ══════════════════════════
 * `retours-visiteurs.server.ts` redéclare les mêmes listes : il ne peut pas
 * importer un fichier "use client". Les garder identiques. */

export const TYPES_RETOUR = ["neMarchePas", "pasClair", "idee", "besoin", "naimePas", "aimeBien"] as const;
export type TypeRetour = (typeof TYPES_RETOUR)[number];

export const ORIGINES_RETOUR = ["bouton", "bulleGenerale", "bulleNouveaute", "bulleErreur", "page404", "pageErreur"] as const;
export type OrigineRetour = (typeof ORIGINES_RETOUR)[number];

export const MAX_CAPTURES = 3;
export const LIMITE_CAPTURE = 5 * 1024 * 1024;
export const MAX_MESSAGE = 3000;

/** Relevé par le navigateur à l'envoi, envoyé en JSON dans le champ `contexte`. */
export type ContexteRetour = {
  page: string;
  titrePage: string;
  section: string;
  parcours: string[];
  provenance: string;
  langue: string;
  ecran: string;
  appliInstallee: boolean;
  erreurs: string[];
  digest: string;
};

export type ResultatRetour = { ok: true } | { ok: false; raison: "invalide" | "echec" | "trop" };

/* ══ Variantes ═════════════════════════════════════════════════════════════
 * Les lettres renvoient au Figma d'origine (`bUpID4IrQkHEGhAzvRrnzf`). */

export const VARIANTES = [
  /** A · Languette sombre « Un avis ? » au bord droit, à mi-hauteur. WhatsApp reste à part. */
  "languette",
  /** B · Petite pastille ronde posée au-dessus de la bulle WhatsApp. */
  "pastille",
  /** C · Une seule bulle ronde qui ouvre un menu : WhatsApp ou avis. */
  "bulle-menu",
  /** F2 · Un bouton libellé « Une question, un avis ? » qui ouvre le même menu. */
  "bouton-menu",
  /** F3 · La bulle WhatsApp ronde, avec une étiquette « Un souci, une idée ? » glissée dessous. */
  "etiquette",
  /** F1 · Une pilule en deux moitiés : avis à gauche, WhatsApp à droite. */
  "pilule",
  /** F4 · La pilule F1 dont le libellé se replie pendant le défilement sur téléphone. Retenue par Médine. */
  "pilule-repliable",
  /** D · Rien ne flotte : une ligne « Un souci sur cette page ? » là où le composant est posé (avant le pied de page). */
  "bas-de-page",
] as const;
export type Variante = (typeof VARIANTES)[number];

/* ══ Textes ════════════════════════════════════════════════════════════════ */

export const TEXTES_PAR_DEFAUT = {
  avis: "Un avis ?",
  etiquette: "Un souci, une idée ?",
  boutonMenu: "Une question, un avis ?",
  basDePage: { texte: "Un souci sur cette page, une idée ?", action: "Dites-le-nous" },
  whatsappAria: "Écrire sur WhatsApp",
  menu: {
    whatsapp: { titre: "Poser une question sur WhatsApp", sous: "Une inscription, un renseignement" },
    avis: { titre: "Donner un avis sur le site", sous: "Un souci, une idée, une critique" },
  },
  bulles: {
    generale: { texte: "Le site est tout nouveau : un souci, une idée, un besoin ?", action: "Écrivez-nous" },
    nouveaute: { texte: "C'est nouveau ! Qu'en pensez-vous ?", action: "Donner mon avis" },
    erreur: { texte: "Quelque chose ne marche pas ?", action: "Dites-le-nous" },
    fermer: "Fermer",
  },
  formulaire: {
    titre: "Un souci, une idée ?",
    accroche:
      "Le site est tout nouveau : **dites-nous tout, le bon comme le moins bon**. Chaque remarque nous aide à l'améliorer, et nous vous en sommes reconnaissants.",
    puces: "C'est à propos de",
    message: "Votre message",
    placeholder: "Dites-nous ce qui s'est passé, ou ce qui vous ferait plaisir",
    captures: {
      invite: "Ajoutez une capture d'écran",
      ou: "ou",
      choisir: "choisissez-la",
      formats: "PNG, JPG ou WebP, 3 au plus",
      retirer: "Retirer",
      refusee: "Cette image n'a pas pu être ajoutée (format ou taille).",
    },
    contact: { label: "Pour qu'on vous réponde (facultatif)", placeholder: "E-mail ou numéro WhatsApp" },
    note: "La page où vous êtes et le type d'appareil partent avec votre message.",
    envoyer: "Envoyer",
    envoi: "Envoi…",
    merci: {
      titre: "Merci, c'est bien reçu",
      texte: "On lit chaque message. Si vous avez laissé un contact, on peut vous répondre.",
      fermer: "Fermer",
    },
    echec: "L'envoi n'a pas abouti. Réessayez dans un instant.",
    trop: "Vous avez envoyé plusieurs messages à la suite. Réessayez dans quelques minutes.",
    whatsapp: "Écrire sur WhatsApp",
  },
  types: {
    neMarchePas: { libelle: "Ça ne marche pas", exemple: "Ex. : le bouton « Écouter » ne fait rien sur mon téléphone" },
    pasClair: { libelle: "Pas clair", exemple: "Ex. : je ne sais pas par où commencer" },
    idee: { libelle: "Une idée", exemple: "Ex. : pouvoir télécharger le document de la page" },
    besoin: { libelle: "Un besoin", exemple: "Ex. : un cours le samedi matin" },
    naimePas: { libelle: "Je n'aime pas", exemple: "Ex. : le texte est trop petit sur mon téléphone" },
    aimeBien: { libelle: "J'aime bien", exemple: "Ex. : ce qui vous a plu" },
  } satisfies Record<TypeRetour, { libelle: string; exemple: string }>,
};
export type Textes = typeof TEXTES_PAR_DEFAUT;

/* ══ Moments : quand proposer la bulle ═════════════════════════════════════ */

/** Durées de départ (Médine, 2026-11-03), à régler avec les chiffres d'analytics. */
export const REGLES_PAR_DEFAUT = {
  /** Aucune bulle avant ce délai depuis le début de la visite. */
  silenceInitial: 20_000,
  /** Bulle générale : après ce temps sur le site… */
  generaleApres: 45_000,
  /** … ou à partir de cette page vue, au premier des deux. */
  generalePages: 3,
  /** Croix sur la bulle générale : plus de bulle générale pendant ce délai. */
  generaleReposApresCroix: 14 * 24 * 3600_000,
  /** Temps sur une rubrique nouvelle avant sa bulle. */
  nouveauteApres: 30_000,
};
export type Regles = typeof REGLES_PAR_DEFAUT;

export type Bulle = "erreur" | "nouveaute" | "generale";

export type EtatVisite = {
  maintenant: number;
  debutVisite: number;
  pagesVues: number;
  bulleDejaVue: boolean;
  erreurEnAttente: boolean;
  nouveaute: { depuis: number } | null;
  generaleFermeeLe: number | null;
};

/**
 * La bulle à montrer maintenant, ou `null`. Fonction pure : c'est elle que l'on
 * teste, sans navigateur.
 *
 * Une seule bulle par visite, quelle qu'elle soit (c'est ce qui évite le spam
 * page après page). Priorité : erreur, puis nouveauté, puis générale.
 */
export function choisirBulle(e: EtatVisite, r: Regles = REGLES_PAR_DEFAUT): Bulle | null {
  if (e.bulleDejaVue) return null;
  if (e.maintenant - e.debutVisite < r.silenceInitial) return null;
  if (e.erreurEnAttente) return "erreur";
  if (e.nouveaute && e.maintenant - e.nouveaute.depuis >= r.nouveauteApres) return "nouveaute";
  const auRepos = e.generaleFermeeLe !== null && e.maintenant - e.generaleFermeeLe < r.generaleReposApresCroix;
  const merite = e.pagesVues >= r.generalePages || e.maintenant - e.debutVisite >= r.generaleApres;
  return !auRepos && merite ? "generale" : null;
}

/* ══ Ouverture depuis ailleurs ═════════════════════════════════════════════ */

const EVENEMENT_OUVRIR = "retours:ouvrir";
export type DetailOuvrir = { origine: OrigineRetour; type?: TypeRetour; digest?: string };

/** Ouvre le formulaire (ligne d'une page 404, page d'erreur avec son `digest`). */
export function ouvrirRetour(detail: DetailOuvrir): void {
  window.dispatchEvent(new CustomEvent<DetailOuvrir>(EVENEMENT_OUVRIR, { detail }));
}

/* ══ Mémoire de la visite ══════════════════════════════════════════════════
 * Visite = onglet (`sessionStorage`). Ce qui survit aux visites (croix,
 * nouveautés déjà présentées) va dans `localStorage`. Les deux peuvent manquer
 * (navigation privée) : tout est protégé, le bouton marche sans. */

const CLE_VISITE = "avis:visite";
const CLE_GENERALE_FERMEE = "avis:generale-fermee";
const cleNouveaute = (cle: string) => `avis:nouveaute:${cle}`;
type Visite = { debut: number; vues: number; pages: string[]; bulle: boolean };

function lire<T>(stockage: () => Storage, cle: string): T | null {
  try {
    const v = stockage().getItem(cle);
    return v === null ? null : (JSON.parse(v) as T);
  } catch {
    return null;
  }
}
function ecrire(stockage: () => Storage, cle: string, valeur: unknown): void {
  try {
    stockage().setItem(cle, JSON.stringify(valeur));
  } catch {
    // Stockage plein ou interdit : on fait sans.
  }
}
const session = () => window.sessionStorage;
const local = () => window.localStorage;

/** « /fr/cours » → « /cours » ; sans effet sur un site sans préfixe de langue. */
const sansLangue = (chemin: string) => chemin.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";

/**
 * Adresses qui portent un secret (lien personnel, jeton) : à masquer avant
 * qu'elles partent vers l'administration ou une messagerie. Médine : les liens
 * personnels du règlement intérieur. À adapter au projet.
 */
const masquer = (chemin: string) => chemin.replace(/(\/reglement\/)[^/?#]+/, "$1[lien personnel]");

/** Titre de la section au milieu de l'écran : le dernier `h1`/`h2` passé avant le milieu. */
function sectionALEcran(): string {
  const milieu = window.innerHeight / 2;
  let titre = "";
  for (const h of Array.from(document.querySelectorAll("main h1, main h2"))) {
    if (h.getBoundingClientRect().top > milieu) break;
    titre = h.textContent?.trim() ?? "";
  }
  return titre.slice(0, 120);
}

/** Une action en cours que la bulle ne doit pas recouvrir : saisie, fenêtre ou tiroir ouvert. */
function occupe(): boolean {
  if (document.activeElement?.matches("input, textarea, select, [contenteditable='true']")) return true;
  return document.querySelector("[role='dialog'][data-state='open']") !== null;
}

/* ══ Formulaire ════════════════════════════════════════════════════════════ */

/**
 * Deux touchers suffisent : une puce, puis Envoyer. Le texte n'est exigé que
 * sans puce, et l'exemple du champ change avec la puce.
 */
function Formulaire({
  t,
  origine,
  typeInitial,
  relever,
  envoyer,
  surFermer,
  whatsapp,
}: {
  t: Textes;
  origine: OrigineRetour;
  typeInitial?: TypeRetour;
  relever: () => ContexteRetour;
  envoyer: (donnees: FormData) => Promise<ResultatRetour>;
  surFermer: () => void;
  whatsapp?: string;
}) {
  const f = t.formulaire;
  const [type, setType] = useState<TypeRetour | undefined>(typeInitial);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [captures, setCaptures] = useState<{ fichier: File; apercu: string }[]>([]);
  const [refusee, setRefusee] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [piege, setPiege] = useState("");
  const [resultat, setResultat] = useState<"ok" | "echec" | "trop" | null>(null);
  const [enCours, demarrer] = useTransition();

  // Aperçus libérés à la fermeture ; une capture retirée libère le sien tout de suite.
  const apercus = useRef(captures);
  useEffect(() => {
    apercus.current = captures;
  }, [captures]);
  useEffect(() => () => apercus.current.forEach((c) => URL.revokeObjectURL(c.apercu)), []);

  const ajouter = (fichiers: File[]) => {
    const valides = fichiers.filter((x) => /^image\/(png|jpeg|webp)$/.test(x.type) && x.size <= LIMITE_CAPTURE);
    setRefusee(valides.length < fichiers.length);
    setCaptures((c) => [...c, ...valides.map((fichier) => ({ fichier, apercu: URL.createObjectURL(fichier) }))].slice(0, MAX_CAPTURES));
  };
  const retirer = (i: number) =>
    setCaptures((l) => {
      URL.revokeObjectURL(l[i].apercu);
      return l.filter((_, j) => j !== i);
    });

  const pret = Boolean(type || message.trim());

  const soumettre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pret || enCours) return;
    const d = new FormData();
    if (type) d.set("type", type);
    d.set("message", message);
    d.set("contact", contact);
    d.set("origine", origine);
    d.set("contexte", JSON.stringify(relever()));
    d.set("site", piege);
    captures.forEach((c) => d.append("captures", c.fichier));
    demarrer(async () => {
      try {
        const res = await envoyer(d);
        setResultat(res.ok ? "ok" : res.raison === "trop" ? "trop" : "echec");
      } catch {
        setResultat("echec");
      }
    });
  };

  const champ = "rounded-sm border border-neutre-trait bg-bg-raised px-3.5 text-[0.9375rem] placeholder:text-text-muted focus:border-text-primary focus:outline-none";

  if (resultat === "ok") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <IconCheck className="h-10 w-10 text-accent" />
        <p className="text-lg font-semibold">{f.merci.titre}</p>
        <p className="text-sm leading-relaxed text-text-muted">{f.merci.texte}</p>
        <button type="button" onClick={surFermer} className="mt-2 w-full rounded-sm border border-border-subtle bg-bg-raised px-5 py-2.5 text-sm font-semibold hover:border-border-strong">
          {f.merci.fermer}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={soumettre} className="relative flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-semibold">{f.titre}</p>
        <button type="button" onClick={surFermer} aria-label={t.bulles.fermer} className="-mt-0.5 -mr-1 rounded-xs p-1 hover:bg-neutre-survol">
          <IconClose className="h-5 w-5" />
        </button>
      </div>
      {/* Seul le passage clé ressort : tout mettre en valeur, c'est ne plus rien faire ressortir. */}
      <p className="text-[0.9375rem] leading-relaxed">{emphase(f.accroche)}</p>

      <fieldset>
        <legend className="sr-only">{f.puces}</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES_RETOUR.map((cle) => (
            <button
              key={cle}
              type="button"
              aria-pressed={type === cle}
              onClick={() => setType((x) => (x === cle ? undefined : cle))}
              className={cx(
                "rounded-sm border px-3.5 py-2 text-sm font-medium transition-colors",
                type === cle ? "border-text-primary bg-text-primary text-text-inverse" : "border-neutre-trait hover:border-text-primary",
              )}
            >
              {t.types[cle].libelle}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="sr-only">{f.message}</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MAX_MESSAGE}
          rows={4}
          placeholder={type ? t.types[type].exemple : f.placeholder}
          className={cx(champ, "resize-none py-3")}
        />
      </label>

      {captures.length > 0 && (
        <ul className="flex flex-col gap-2">
          {captures.map((c, i) => (
            <li key={c.apercu} className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local, rien à optimiser */}
              <img src={c.apercu} alt="" className="h-14 w-14 rounded-sm border border-border-subtle object-cover" />
              <span className="min-w-0 flex-1 truncate text-sm">{c.fichier.name}</span>
              <button type="button" onClick={() => retirer(i)} className="text-sm text-text-muted underline underline-offset-4 hover:text-text-primary">
                {f.captures.retirer}
              </button>
            </li>
          ))}
        </ul>
      )}
      {captures.length < MAX_CAPTURES && (
        // Zone de dépôt : le motif que tout le monde reconnaît, plutôt qu'un bouton « Choisir un fichier ».
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setSurvol(true);
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurvol(false);
            ajouter(Array.from(e.dataTransfer.files));
          }}
          className={cx(
            "flex cursor-pointer flex-col items-center gap-1.5 rounded-md border-2 border-dashed px-4 py-5 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
            survol ? "border-accent bg-accent-soft" : "border-neutre-trait bg-bg-raised hover:border-accent",
          )}
        >
          <IconTeleverser className="h-6 w-6 text-accent" />
          <span className="text-sm">
            <span className="font-semibold">{f.captures.invite}</span> {f.captures.ou}{" "}
            <span className="font-semibold text-accent underline underline-offset-4">{f.captures.choisir}</span>
          </span>
          <span className="text-xs text-text-muted">{f.captures.formats}</span>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            multiple
            className="sr-only"
            onChange={(e) => {
              ajouter(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </label>
      )}
      {refusee && <p className="text-sm text-accent-warm-texte">{f.captures.refusee}</p>}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{f.contact.label}</span>
        <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} autoComplete="email" placeholder={f.contact.placeholder} className={cx(champ, "py-2.5")} />
      </label>

      {resultat && (
        <p role="alert" className="text-sm text-accent-warm-texte">
          {resultat === "trop" ? f.trop : f.echec}{" "}
          {resultat === "echec" && whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener" className="font-semibold underline underline-offset-4">
              {f.whatsapp}
            </a>
          )}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-text-muted sm:max-w-[13rem]">{f.note}</p>
        <button type="submit" disabled={!pret || enCours} className="inline-flex items-center justify-center rounded-sm bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-45">
          {enCours ? f.envoi : f.envoyer}
        </button>
      </div>

      {/* Champ piège : hors écran, hors tabulation, hors lecteur d'écran. */}
      <div aria-hidden="true" className="absolute top-0 left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Site
          <input type="text" tabIndex={-1} autoComplete="off" value={piege} onChange={(e) => setPiege(e.target.value)} />
        </label>
      </div>
    </form>
  );
}

/* ══ Points d'entrée : un adaptateur par variante ══════════════════════════
 * Chaque adaptateur ne dessine que le point d'entrée. Il reçoit de quoi ouvrir
 * le formulaire ou WhatsApp ; le reste (bulle, panneau, contexte) est commun.
 * Ajouter une variante = ajouter une entrée ici et son nom dans `VARIANTES`. */

type ProprietesEntree = {
  t: Textes;
  /** Lien WhatsApp, ou `null` quand il est absent ou masqué sur cette page. */
  whatsapp: string | null;
  ouvrirAvis: () => void;
  /** Libellé replié (téléphone, pendant le défilement) : seule `pilule-repliable` s'en sert. */
  replie: boolean;
};

const ombre = "shadow-feuille-fort";
const anneau = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";

function RondWhatsapp({ href, t, taille = "h-14 w-14" }: { href: string; t: Textes; taille?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" aria-label={t.whatsappAria} className={cx("flex items-center justify-center rounded-full bg-brand-whatsapp text-on-media hover:opacity-85", ombre, taille, anneau)}>
      <IconWhatsapp className="h-7 w-7" />
    </a>
  );
}

/** Libellé qui peut se replier : largeur nulle, mais le texte reste lu par les lecteurs d'écran. */
function Libelle({ texte, replie }: { texte: string; replie: boolean }) {
  return (
    <span className={cx("min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 motion-reduce:transition-none", replie ? "max-w-0 opacity-0" : "max-w-[12rem] opacity-100")}>
      <span className="block pl-2 text-[0.9375rem] font-semibold">{texte}</span>
    </span>
  );
}

function Pilule({ t, whatsapp, ouvrirAvis, replie }: ProprietesEntree) {
  return (
    <div className={cx("flex h-13 overflow-hidden rounded-full border border-border-subtle bg-bg-raised text-text-primary", ombre)}>
      <button type="button" onClick={ouvrirAvis} className={cx("flex items-center pr-3.5 pl-4 hover:bg-neutre-survol", anneau)}>
        <IconAvis className="h-5 w-5 shrink-0" />
        <Libelle texte={t.avis} replie={replie} />
      </button>
      {whatsapp && (
        <a href={whatsapp} target="_blank" rel="noopener" aria-label={t.whatsappAria} className={cx("flex w-13 items-center justify-center bg-brand-whatsapp text-on-media hover:opacity-85", anneau)}>
          <IconWhatsapp className="h-7 w-7" />
        </a>
      )}
    </div>
  );
}

/** Menu des variantes `bulle-menu` et `bouton-menu` : WhatsApp ou avis. */
function MenuDeuxPortes({ t, whatsapp, ouvrirAvis, fermer }: { t: Textes; whatsapp: string | null; ouvrirAvis: () => void; fermer: () => void }) {
  const ligne = "flex w-full items-center gap-3.5 px-4 py-3 text-left hover:bg-neutre-survol";
  return (
    <div className={cx("w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-md border border-border-subtle bg-bg-raised py-1.5 text-text-primary", ombre)}>
      {whatsapp && (
        <a href={whatsapp} target="_blank" rel="noopener" onClick={fermer} className={ligne}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-whatsapp text-on-media">
            <IconWhatsapp className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[0.9375rem] font-semibold">{t.menu.whatsapp.titre}</span>
            <span className="block text-sm text-text-muted">{t.menu.whatsapp.sous}</span>
          </span>
        </a>
      )}
      <button
        type="button"
        onClick={() => {
          fermer();
          ouvrirAvis();
        }}
        className={cx(ligne, whatsapp && "border-t border-border-subtle")}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-text-primary text-text-inverse">
          <IconAvis className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[0.9375rem] font-semibold">{t.menu.avis.titre}</span>
          <span className="block text-sm text-text-muted">{t.menu.avis.sous}</span>
        </span>
      </button>
    </div>
  );
}

/** Les deux variantes à menu : seul le bouton fermé diffère. */
function AvecMenu({ libelle, ...p }: ProprietesEntree & { libelle: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="flex flex-col items-end gap-3">
      {ouvert && <MenuDeuxPortes t={p.t} whatsapp={p.whatsapp} ouvrirAvis={p.ouvrirAvis} fermer={() => setOuvert(false)} />}
      <button
        type="button"
        aria-expanded={ouvert}
        aria-label={ouvert ? p.t.bulles.fermer : undefined}
        onClick={() => setOuvert((o) => !o)}
        className={cx("flex h-13 items-center rounded-full bg-accent text-accent-foreground", ombre, anneau, libelle && !ouvert ? "gap-2.5 pr-5 pl-3" : "w-13 justify-center")}
      >
        {ouvert ? (
          <IconClose className="h-6 w-6" />
        ) : libelle ? (
          <>
            <span className="flex -space-x-1.5">
              {p.whatsapp && (
                <span className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-brand-whatsapp text-on-media">
                  <IconWhatsapp className="h-4 w-4" />
                </span>
              )}
              <span className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-bg-raised text-text-primary">
                <IconAvis className="h-4 w-4" />
              </span>
            </span>
            <span className="text-[0.9375rem] font-semibold">{p.t.boutonMenu}</span>
          </>
        ) : (
          <IconAvis className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}

/** Adaptateurs des variantes flottantes (`languette` et `bas-de-page` se posent ailleurs que dans le coin). */
const POINTS_ENTREE: Record<Exclude<Variante, "languette" | "bas-de-page">, (p: ProprietesEntree) => React.ReactNode> = {
  pastille: ({ t, whatsapp, ouvrirAvis }) => (
    <div className="flex flex-col items-center gap-3">
      <button type="button" onClick={ouvrirAvis} title={t.etiquette} aria-label={t.avis} className={cx("flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-bg-raised text-text-primary", ombre, anneau)}>
        <IconAvis className="h-5 w-5" />
      </button>
      {whatsapp && <RondWhatsapp href={whatsapp} t={t} />}
    </div>
  ),
  "bulle-menu": (p) => <AvecMenu {...p} libelle={false} />,
  "bouton-menu": (p) => <AvecMenu {...p} libelle />,
  etiquette: ({ t, whatsapp, ouvrirAvis }) => (
    <div className="flex items-center">
      <button type="button" onClick={ouvrirAvis} className={cx("-mr-5 flex h-9.5 items-center gap-2 rounded-l-sm bg-text-primary pr-8 pl-3.5 text-sm font-semibold text-text-inverse", ombre, anneau)}>
        <IconAvis className="h-4 w-4" />
        {t.etiquette}
      </button>
      {whatsapp ? <RondWhatsapp href={whatsapp} t={t} taille="relative h-14 w-14" /> : <span className="w-5" />}
    </div>
  ),
  pilule: (p) => <Pilule {...p} replie={false} />,
  "pilule-repliable": (p) => <Pilule {...p} />,
};

/* ══ Le module ═════════════════════════════════════════════════════════════ */

/**
 * Retours des visiteurs : point d'entrée (selon `variante`), bulle avec croix
 * aux bons moments, formulaire dans un panneau (ancré sur ordinateur, tiroir
 * sur téléphone), contexte relevé à l'envoi.
 *
 * À monter une fois, dans le layout racine (sauf `bas-de-page` : à poser là où
 * la ligne doit apparaître, juste avant le pied de page ; sa bulle flotte quand
 * même en bas à droite).
 *
 * @param envoyer Reçoit un `FormData` : `type`, `message`, `contact`,
 *   `origine`, `contexte` (JSON `ContexteRetour`), `captures` (0 à 3 images),
 *   `site` (champ piège : rempli = robot). Une Server Action convient telle
 *   quelle (voir `retours-visiteurs.server.ts`).
 * @param whatsapp Lien `https://wa.me/…`. Sans lui, les variantes n'affichent que l'avis.
 * @param masquerWhatsappSur Derniers segments d'adresse où la moitié WhatsApp
 *   disparaît (une page contact qui est déjà une mise en relation).
 * @param nouveautes Rubriques nouvelles : bulle « C'est nouveau » une fois par
 *   visiteur après `regles.nouveauteApres` passé dessus.
 * @param analytics Reçoit les événements (`bulle_vue`, `bulle_fermee`,
 *   `avis_ouvert`, `avis_envoye`) : Umami, Plausible, rien…
 */
export default function RetoursVisiteurs({
  variante,
  envoyer,
  whatsapp,
  textes,
  regles,
  nouveautes = [],
  masquerWhatsappSur = ["contact"],
  analytics,
}: {
  variante: Variante;
  envoyer: (donnees: FormData) => Promise<ResultatRetour>;
  whatsapp?: string;
  textes?: Partial<Textes>;
  regles?: Partial<Regles>;
  nouveautes?: { cle: string; prefixe: string }[];
  masquerWhatsappSur?: string[];
  analytics?: (evenement: string, donnees?: Record<string, unknown>) => void;
}) {
  const t: Textes = { ...TEXTES_PAR_DEFAUT, ...textes };
  const pathname = usePathname() ?? "/";
  const telephone = useMedia("(max-width: 639.98px)");
  const ordinateur = useMedia("(min-width: 1024px)");
  const dernierSegment = sansLangue(pathname).split("/").filter(Boolean).at(-1) ?? "";
  const lienWhatsapp = whatsapp && !masquerWhatsappSur.includes(dernierSegment) ? whatsapp : null;

  const [ouvert, setOuvert] = useState(false);
  const [ouverture, setOuverture] = useState<DetailOuvrir>({ origine: "bouton" });
  const [bulle, setBulle] = useState<Bulle | null>(null);
  const [replie, setReplie] = useState(false);
  const erreurs = useRef<string[]>([]);
  const erreurEnAttente = useRef(false);
  const nouveaute = useRef<{ cle: string; depuis: number } | null>(null);
  const suivre = useRef(analytics);
  const reglesEff = useRef({ ...REGLES_PAR_DEFAUT, ...regles });
  useEffect(() => {
    suivre.current = analytics;
    reglesEff.current = { ...REGLES_PAR_DEFAUT, ...regles };
  });

  // Pages vues : compteur de la visite et dernières adresses (contexte du message).
  useEffect(() => {
    const v = lire<Visite>(session, CLE_VISITE) ?? { debut: Date.now(), vues: 0, pages: [], bulle: false };
    const chemin = masquer(pathname);
    if (v.pages.at(-1) !== chemin) {
      v.vues += 1;
      v.pages = [...v.pages, chemin].slice(-6);
    }
    ecrire(session, CLE_VISITE, v);
    const rubrique = nouveautes.find((n) => sansLangue(pathname).startsWith(n.prefixe));
    nouveaute.current =
      rubrique && !lire(local, cleNouveaute(rubrique.cle))
        ? nouveaute.current?.cle === rubrique.cle
          ? nouveaute.current
          : { cle: rubrique.cle, depuis: Date.now() }
        : null;
    // `nouveautes` est une liste fixe par site : la relire à chaque page suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Erreurs de la page, gardées pour le message ; elles appellent la bulle
  // « Quelque chose ne marche pas ? ». Seules celles du site comptent : une
  // extension ou un script tiers qui plante n'est pas un bug du site.
  useEffect(() => {
    const noter = (texte: string) => {
      erreurs.current = [...erreurs.current, texte.slice(0, 300)].slice(-5);
      erreurEnAttente.current = true;
    };
    const surErreur = (e: ErrorEvent) => {
      if (!e.filename?.startsWith(window.location.origin) || /ResizeObserver loop/.test(e.message)) return;
      noter(`${e.message} (${e.filename.replace(window.location.origin, "")}:${e.lineno})`);
    };
    const surRejet = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof Error && e.reason.stack?.includes(window.location.origin)) noter(e.reason.message);
    };
    window.addEventListener("error", surErreur);
    window.addEventListener("unhandledrejection", surRejet);
    return () => {
      window.removeEventListener("error", surErreur);
      window.removeEventListener("unhandledrejection", surRejet);
    };
  }, []);

  // Le moment d'une bulle, vérifié toutes les 3 secondes.
  useEffect(() => {
    if (bulle || ouvert) return;
    const id = window.setInterval(() => {
      const v = lire<Visite>(session, CLE_VISITE);
      if (!v || occupe()) return;
      const choix = choisirBulle(
        {
          maintenant: Date.now(),
          debutVisite: v.debut,
          pagesVues: v.vues,
          bulleDejaVue: v.bulle,
          erreurEnAttente: erreurEnAttente.current,
          nouveaute: nouveaute.current,
          generaleFermeeLe: lire<number>(local, CLE_GENERALE_FERMEE),
        },
        reglesEff.current,
      );
      if (!choix) return;
      ecrire(session, CLE_VISITE, { ...v, bulle: true });
      if (choix === "nouveaute" && nouveaute.current) ecrire(local, cleNouveaute(nouveaute.current.cle), 1);
      erreurEnAttente.current = false;
      setBulle(choix);
      suivre.current?.("bulle_vue", { bulle: choix });
    }, 3000);
    return () => window.clearInterval(id);
  }, [bulle, ouvert]);

  // Libellé replié pendant le défilement : téléphone et variante repliable seulement.
  useEffect(() => {
    if (!telephone || variante !== "pilule-repliable") return;
    let minuteur = 0;
    const surDefilement = () => {
      setReplie(true);
      window.clearTimeout(minuteur);
      minuteur = window.setTimeout(() => setReplie(false), 1000);
    };
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => {
      window.removeEventListener("scroll", surDefilement);
      window.clearTimeout(minuteur);
    };
  }, [telephone, variante]);

  const ouvrir = (d: DetailOuvrir) => {
    setOuverture(d);
    setBulle(null);
    setOuvert(true);
    analytics?.("avis_ouvert", { origine: d.origine });
  };

  // Ouverture depuis ailleurs (`ouvrirRetour`) : l'écouteur lit toujours la dernière `ouvrir`.
  const ouvrirActuel = useRef(ouvrir);
  useEffect(() => {
    ouvrirActuel.current = ouvrir;
  });
  useEffect(() => {
    const surOuvrir = (e: Event) => ouvrirActuel.current((e as CustomEvent<DetailOuvrir>).detail);
    window.addEventListener(EVENEMENT_OUVRIR, surOuvrir);
    return () => window.removeEventListener(EVENEMENT_OUVRIR, surOuvrir);
  }, []);

  const fermerBulle = () => {
    if (bulle === "generale") ecrire(local, CLE_GENERALE_FERMEE, Date.now());
    analytics?.("bulle_fermee", { bulle });
    setBulle(null);
  };

  const relever = (): ContexteRetour => {
    const v = lire<Visite>(session, CLE_VISITE);
    let provenance = "";
    try {
      const r = document.referrer ? new URL(document.referrer) : null;
      provenance = r ? (r.origin === window.location.origin ? masquer(r.pathname) : r.host) : "";
    } catch {
      // Adresse illisible : on ne la donne pas.
    }
    return {
      page: masquer(window.location.pathname + window.location.search + window.location.hash),
      titrePage: document.title,
      section: sectionALEcran(),
      parcours: v?.pages ?? [],
      provenance,
      langue: document.documentElement.lang,
      ecran: `${window.innerWidth}×${window.innerHeight}`,
      appliInstallee: window.matchMedia("(display-mode: standalone)").matches,
      erreurs: erreurs.current,
      digest: ouverture.digest ?? "",
    };
  };

  const envoyerSuivi = async (d: FormData) => {
    const res = await envoyer(d);
    if (res.ok) analytics?.("avis_envoye", { type: d.get("type") ?? "aucun", origine: d.get("origine") });
    return res;
  };

  const ORIGINE_BULLE: Record<Bulle, OrigineRetour> = { generale: "bulleGenerale", nouveaute: "bulleNouveaute", erreur: "bulleErreur" };
  const ouvrirAvis = () => ouvrir({ origine: "bouton" });
  const proprietes: ProprietesEntree = { t, whatsapp: lienWhatsapp, ouvrirAvis, replie };

  const formulaire = (
    <Formulaire
      key={`${ouverture.origine}-${ouverture.type ?? ""}`}
      t={t}
      origine={ouverture.origine}
      typeInitial={ouverture.type}
      relever={relever}
      envoyer={envoyerSuivi}
      surFermer={() => setOuvert(false)}
      whatsapp={whatsapp}
    />
  );

  const laBulle = bulle && (
    <div role="status" className={cx("flex w-[min(17rem,calc(100vw-2.5rem))] items-start gap-2 rounded-sm bg-text-primary py-3 pr-2 pl-4 text-text-inverse", ombre)}>
      <button
        type="button"
        onClick={() => ouvrir({ origine: ORIGINE_BULLE[bulle], type: bulle === "erreur" ? "neMarchePas" : undefined })}
        className="flex-1 text-left text-[0.9375rem] leading-snug font-medium"
      >
        {t.bulles[bulle].texte}
        <span className="mt-2 block font-semibold underline underline-offset-4">{t.bulles[bulle].action}</span>
      </button>
      <button type="button" onClick={fermerBulle} aria-label={t.bulles.fermer} className="rounded-xs p-1 hover:bg-text-inverse/15">
        <IconClose className="h-4.5 w-4.5" />
      </button>
    </div>
  );

  // Le point d'entrée, et où il se pose.
  let entree: React.ReactNode;
  let coin: React.ReactNode = null;
  if (variante === "bas-de-page") {
    entree = (
      <p className="py-8 text-center text-text-primary">
        {t.basDePage.texte}{" "}
        <button type="button" onClick={ouvrirAvis} className="font-semibold text-accent underline underline-offset-4 hover:text-accent-hover">
          {t.basDePage.action}
        </button>
      </p>
    );
    coin = (
      <>
        {laBulle}
        {lienWhatsapp && <RondWhatsapp href={lienWhatsapp} t={t} />}
      </>
    );
  } else if (variante === "languette") {
    entree = (
      <button
        type="button"
        onClick={ouvrirAvis}
        // Le texte se lit de bas en haut, comme les languettes de retour connues.
        className={cx("fixed top-[58%] right-0 z-40 flex -translate-y-1/2 items-center gap-2 rounded-l-sm bg-text-primary px-1.5 py-4 text-[0.8125rem] font-semibold text-text-inverse [writing-mode:vertical-rl] rotate-180 sm:top-1/2 sm:px-2 sm:text-sm", ombre, anneau)}
      >
        <IconAvis className="h-4 w-4 rotate-90" />
        {t.avis}
      </button>
    );
    coin = (
      <>
        {laBulle}
        {lienWhatsapp && <RondWhatsapp href={lienWhatsapp} t={t} />}
      </>
    );
  } else {
    const Entree = POINTS_ENTREE[variante];
    entree = null;
    coin = (
      <>
        {laBulle}
        <Entree {...proprietes} />
      </>
    );
  }

  // Panneau : tiroir sur téléphone et tablette, panneau ancré au coin sur
  // ordinateur. Contrôlés tous les deux, sans déclencheur : le point d'entrée
  // ouvre par `ouvrir`, ce qui laisse la moitié WhatsApp hors du panneau.
  const panneau = ordinateur ? (
    <Popover.Root open={ouvert} onOpenChange={setOuvert}>
      <Popover.Anchor className="fixed right-5 bottom-[calc(var(--hauteur-lecteur,0px)+1.25rem)] h-px w-px" />
      <Popover.Portal>
        <Popover.Content
          aria-label={t.formulaire.titre}
          side="top"
          align="end"
          sideOffset={76}
          collisionPadding={16}
          className={cx("z-50 max-h-(--radix-popover-content-available-height) w-[25rem] overflow-y-auto rounded-sm border border-border-subtle bg-bg-raised p-5 text-text-primary focus-visible:outline-none", ombre)}
        >
          {formulaire}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  ) : (
    <Drawer.Root open={ouvert} onOpenChange={setOuvert}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-scrim/45" />
        <Drawer.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-md border-t border-border-subtle bg-bg-raised text-text-primary focus-visible:outline-none">
          <div aria-hidden="true" className="mx-auto mt-2.5 mb-1 h-1 w-10 shrink-0 rounded-full bg-neutre-trait" />
          <Drawer.Title className="sr-only">{t.formulaire.titre}</Drawer.Title>
          <div className="overflow-y-auto px-4 pt-2 pb-6">{formulaire}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );

  return (
    <>
      {entree}
      {/* `--hauteur-lecteur` : une barre fixée en bas (lecteur audio) publie sa hauteur, le coin remonte au-dessus. */}
      <div className="fixed right-5 bottom-[calc(var(--hauteur-lecteur,0px)+1.25rem)] z-40 flex flex-col items-end gap-3">{coin}</div>
      {panneau}
    </>
  );
}

/**
 * La ligne « Vous cherchiez quelque chose ? Dites-le-nous » d'une page 404 ou
 * d'erreur : ouvre le formulaire avec « Ça ne marche pas » déjà choisi, et la
 * référence de l'erreur jointe (`digest` de `error.tsx`).
 */
export function LienAvis({ texte, action, origine, digest }: { texte: string; action: string; origine: OrigineRetour; digest?: string }) {
  return (
    <p className="text-text-muted">
      {texte}{" "}
      <button type="button" onClick={() => ouvrirRetour({ origine, type: "neMarchePas", digest })} className="font-semibold text-accent underline underline-offset-4 hover:text-accent-hover">
        {action}
      </button>
    </p>
  );
}
