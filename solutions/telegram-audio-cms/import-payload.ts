/**
 * Étape 6 de `pipeline.py` : importe les fiches générées par IA dans Payload
 * CMS (thèmes, séries, fichiers audio et séances), d'après le classement de la
 * passe 2.
 *
 * Origine : MEDINE_INSTITUT, `scripts/import-cours-gratuits.ts`, recopié tel
 * quel (seul cet en-tête change). Lancé par `tsx --env-file=.env` depuis le
 * projet Next.js + Payload (la cible locale importe `@/payload.config`).
 *
 * Sources, dans le dossier de travail de `pipeline.py` (`COURS_GRATUITS_DIR`,
 * par défaut `~/Documents/telegram-ogg-dl`) :
 * - `series.json` : classement de l'étape `regrouper` (thème, série, ordre) ;
 * - `fiches/<id>.json` : une fiche par audio (étape `analyser`) ;
 * - l'audio : `m4a/<nom>.m4a` s'il a été converti, sinon l'`.ogg` brut de Telegram.
 *
 * Rejouable : les thèmes et séries sont retrouvés par slug, les séances par id
 * du message Telegram, les fichiers par nom. Une séance existante est mise à
 * jour, son audio n'est pas renvoyé. Correspondance des champs : section
 * « Contrat fiche JSON ↔ Payload » du README.
 *
 * Simulation par défaut. `--ecrire` écrit ; `--publier` publie les séances au
 * lieu de les laisser en brouillon (aperçu, ou site de préproduction : sur la
 * prod publique, une fiche n'est publiée qu'après relecture).
 *
 * Deux cibles :
 * - sans `--url` : la base du `.env` (dev), par l'API locale de Payload ;
 * - `--url https://…` : un site déployé, par son API REST, connecté comme
 *   l'administration (`docs/medine-institut/ecrire-en-prod.md`). C'est ce
 *   serveur qui écrit dans sa base et range les fichiers dans son R2, et ses
 *   hooks revalident son cache. Identifiants dans un fichier hors dépôt :
 *
 * ```bash
 * set -a; . ~/.medine-preprod.env; set +a   # MEDINE_ADMIN_EMAIL / MEDINE_ADMIN_PASSWORD
 * npm run import:cours-gratuits -- --url https://… [--ecrire] [--publier]
 * ```
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DIR = process.env.COURS_GRATUITS_DIR ?? path.join(os.homedir(), "Documents/telegram-ogg-dl");
const ECRIRE = process.argv.includes("--ecrire");
const PUBLIER = process.argv.includes("--publier");
const URL_CIBLE = process.argv[process.argv.indexOf("--url") + 1]?.replace(/\/$/, "");
const DISTANT = process.argv.includes("--url");

type Collection = "themes-audio" | "series-audio" | "seances-audio" | "fichiers-audio";
type Doc = { id: number; slug?: string; audio?: number | { id: number } | null };

/**
 * Ce dont l'import a besoin, quelle que soit la cible. `filtre` : égalité sur
 * un champ ; `brouillons` : lire et écrire la dernière version, brouillon
 * compris (seules les séances ont des brouillons).
 */
type Cible = {
  trouver(collection: Collection, filtre?: [string, string | number], brouillons?: boolean): Promise<Doc[]>;
  creer(collection: Collection, data: object, brouillon?: boolean): Promise<Doc>;
  modifier(collection: Collection, id: number, data: object, brouillon?: boolean): Promise<Doc>;
  /** Téléverse le fichier sous le nom `nom` ; renvoie le document créé. */
  envoyerAudio(chemin: string, nom: string): Promise<Doc>;
};

async function cibleLocale(): Promise<Cible> {
  const { getPayload } = await import("payload");
  const { default: configPromise } = await import("@/payload.config");
  const payload = await getPayload({ config: configPromise });
  // Hors serveur Next, `revalidateTag` lève une erreur : voir `lib/hooks/revalidate.ts`.
  const context = { disableRevalidate: true };
  return {
    trouver: async (collection, filtre, brouillons) =>
      (
        await payload.find({
          collection,
          where: filtre ? { [filtre[0]]: { equals: filtre[1] } } : undefined,
          limit: filtre ? 1 : 0,
          depth: 0,
          draft: brouillons,
        })
      ).docs as Doc[],
    creer: async (collection, data, brouillon) =>
      (await payload.create({ collection, context, data: data as never, draft: brouillon })) as Doc,
    modifier: async (collection, id, data, brouillon) =>
      (await payload.update({ collection, context, id, data: data as never, draft: brouillon })) as Doc,
    envoyerAudio: async (chemin, nom) => {
      // Payload nomme le fichier d'après le chemin téléversé, et le nom
      // d'origine (« record (1116).ogg ») ne dit rien : copie renommée.
      const copie = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cours-gratuits-")), nom);
      fs.copyFileSync(chemin, copie);
      try {
        return (await payload.create({ collection: "fichiers-audio", context, data: {}, filePath: copie })) as Doc;
      } finally {
        fs.rmSync(path.dirname(copie), { recursive: true });
      }
    },
  };
}

async function cibleDistante(base: string): Promise<Cible> {
  // `Origin` explicite : Payload jette sinon la session (incident du 2026-08-29).
  const r = await fetch(`${base}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ email: process.env.MEDINE_ADMIN_EMAIL, password: process.env.MEDINE_ADMIN_PASSWORD }),
  });
  if (!r.ok) throw new Error(`connexion à ${base} refusée (${r.status})`);
  const { token } = (await r.json()) as { token?: string };
  if (!token) throw new Error("connexion sans token");
  const auth = { Origin: base, Authorization: `JWT ${token}` };

  async function appel(methode: string, chemin: string, corps?: object | FormData) {
    const json = corps && !(corps instanceof FormData);
    const reponse = await fetch(`${base}/api/${chemin}`, {
      method: methode,
      headers: json ? { ...auth, "Content-Type": "application/json" } : auth,
      body: json ? JSON.stringify(corps) : (corps as FormData | undefined),
    });
    if (!reponse.ok) throw new Error(`${methode} /api/${chemin} → ${reponse.status} ${await reponse.text()}`);
    return reponse.json();
  }
  const draft = (brouillon?: boolean) => (brouillon ? "draft=true" : "");

  return {
    trouver: async (collection, filtre, brouillons) => {
      const params = new URLSearchParams({ depth: "0", limit: filtre ? "1" : "0" });
      if (filtre) params.set(`where[${filtre[0]}][equals]`, String(filtre[1]));
      if (brouillons) params.set("draft", "true");
      return (await appel("GET", `${collection}?${params}`)).docs;
    },
    creer: async (collection, data, brouillon) => (await appel("POST", `${collection}?${draft(brouillon)}`, data)).doc,
    modifier: async (collection, id, data, brouillon) =>
      (await appel("PATCH", `${collection}/${id}?${draft(brouillon)}`, data)).doc,
    envoyerAudio: async (chemin, nom) => {
      const formulaire = new FormData();
      formulaire.append("file", await fs.openAsBlob(chemin, { type: "audio/mp4" }), nom);
      formulaire.append("_payload", "{}");
      return (await appel("POST", "fichiers-audio", formulaire)).doc;
    },
  };
}

type Fiche = {
  titre: string;
  resume: string;
  themes: string[];
  plan: { titre: string; debut_ar: string; debut_fr: string }[];
  lexique: { translit: string; arabe: string; sens: string }[];
  dates: { date: string; evenement: string }[];
  personnages: { nom: string; temps: string }[];
  ouvrages: { titre: string; role: "texte étudié" | "cité"; temps: string }[];
  references: string[];
  points_incertains: string[];
  _controles?: string[];
  _source: { id: number; fichier: string; date: string; duree_min: number };
};

type Classement = {
  series: {
    nom: string;
    theme: string;
    description: string;
    seances: { id: number; numero: number; titre: string }[];
  }[];
};

/**
 * Mots retirés des adresses, pour des slugs courts (arbitrage du 2026-10-15) :
 * « Les quarante hadiths d'an-Nawawi » → `quarante-hadiths-nawawi`. Articles
 * et liaisons du français, et l'article arabe translittéré (al-, an-…).
 */
const MOTS_VIDES = new Set([
  "le", "la", "les", "de", "du", "des", "et", "a", "au", "aux", "un", "une",
  "al", "an", "ar", "as", "at", "az", "ad", "ash", "ach", "ul",
]);

function slugifier(texte: string): string {
  const mots = texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ﷺ/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    // Élision française (l', d', qu') retirée ; toute autre apostrophe est
    // interne à un mot translittéré (« a'la », « ka'ba ») et le garde entier.
    .replace(/\b(?:l|d|qu)['’]/g, " ")
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((mot) => mot && !MOTS_VIDES.has(mot));
  // Coupé à 80 caractères sur une fin de mot.
  let slug = "";
  for (const mot of mots) {
    if (slug && slug.length + 1 + mot.length > 80) break;
    slug = slug ? `${slug}-${mot}` : mot;
  }
  return slug;
}

/** « MM:SS » ou « H:MM:SS » → secondes ; chaîne vide → null. */
function secondes(minutage: string): number | null {
  if (!minutage) return null;
  return minutage.split(":").reduce((total, partie) => total * 60 + Number(partie), 0);
}

/** Le fichier à téléverser : la version convertie si elle existe. */
function fichierAudio(source: Fiche["_source"]): string {
  const m4a = path.join(DIR, "m4a", source.fichier.replace(/\.ogg$/, ".m4a"));
  return fs.existsSync(m4a) ? m4a : path.join(DIR, "ogg", source.fichier);
}

function donneesSeance(fiche: Fiche) {
  return {
    resume: fiche.resume,
    themes: fiche.themes,
    plan: fiche.plan.map((r) => ({ titre: r.titre, debutAr: secondes(r.debut_ar), debutFr: secondes(r.debut_fr) })),
    lexique: fiche.lexique,
    dates: fiche.dates,
    personnages: fiche.personnages.map((p) => ({ nom: p.nom, temps: secondes(p.temps) })),
    ouvrages: fiche.ouvrages.map((o) => ({
      titre: o.titre,
      role: o.role === "texte étudié" ? ("texte-etudie" as const) : ("cite" as const),
      temps: secondes(o.temps),
    })),
    references: fiche.references,
    pointsIncertains: fiche.points_incertains.map((texte) => ({ texte })),
    controles: (fiche._controles ?? []).map((texte) => ({ texte })),
    telegramId: fiche._source.id,
    // La date de l'inventaire est en heure de Paris, sans fuseau.
    dateEnregistrement: new Date(fiche._source.date.replace(" ", "T")).toISOString(),
    duree: Math.round(fiche._source.duree_min * 60),
  };
}

async function main() {
  const classement: Classement = JSON.parse(fs.readFileSync(path.join(DIR, "series.json"), "utf-8"));
  const fiches = new Map<number, Fiche>();
  for (const nom of fs.readdirSync(path.join(DIR, "fiches"))) {
    if (!nom.endsWith(".json")) continue;
    const fiche: Fiche = JSON.parse(fs.readFileSync(path.join(DIR, "fiches", nom), "utf-8"));
    fiches.set(fiche._source.id, fiche);
  }

  if (DISTANT && !URL_CIBLE?.startsWith("http")) throw new Error("--url attend une adresse https://…");
  const cible = DISTANT ? await cibleDistante(URL_CIBLE) : await cibleLocale();
  console.log(`Cible : ${DISTANT ? URL_CIBLE : "base locale (.env)"}`);
  console.log(ECRIRE ? `Écriture (${PUBLIER ? "publiées" : "brouillons"})` : "Simulation : rien n'est écrit (--ecrire pour écrire)");

  // Un slug de séance est unique sur toutes les séries : on réserve ceux des
  // séances déjà en base qui ne sont pas réimportées ici.
  const existantes = await cible.trouver("seances-audio", undefined, true);
  const slugsPris = new Set(existantes.map((d) => d.slug));

  const themes = new Map<string, number | string>();
  let ordreTheme = 0;
  const classees = new Set<number>();

  for (const [ordreSerie, serie] of classement.series.entries()) {
    const slugTheme = slugifier(serie.theme);
    if (!themes.has(slugTheme)) {
      ordreTheme += 1;
      const [trouve] = await cible.trouver("themes-audio", ["slug", slugTheme]);
      const donnees = { titre: serie.theme, slug: slugTheme, ordre: ordreTheme };
      let id: number | string = trouve?.id ?? `(nouveau ${slugTheme})`;
      if (ECRIRE) {
        id = trouve
          ? (await cible.modifier("themes-audio", trouve.id, donnees)).id
          : (await cible.creer("themes-audio", donnees)).id;
      }
      themes.set(slugTheme, id);
    }

    const slugSerie = slugifier(serie.nom);
    console.log(`\n${serie.theme} › ${serie.nom}  (/${slugSerie})`);
    const [trouvee] = await cible.trouver("series-audio", ["slug", slugSerie]);
    const donneesSerie = {
      titre: serie.nom,
      slug: slugSerie,
      theme: themes.get(slugTheme) as number,
      description: serie.description,
      ordre: ordreSerie + 1,
    };
    let idSerie: number | string = trouvee?.id ?? "(nouvelle)";
    if (ECRIRE) {
      idSerie = trouvee
        ? (await cible.modifier("series-audio", trouvee.id, donneesSerie)).id
        : (await cible.creer("series-audio", donneesSerie)).id;
    }

    for (const seance of [...serie.seances].sort((a, b) => a.numero - b.numero)) {
      const fiche = fiches.get(seance.id);
      if (!fiche) {
        console.log(`  ⚠ ${seance.id} : pas de fiche, ignorée`);
        continue;
      }
      classees.add(seance.id);
      // Le titre de la fiche (passe 1, qui a entendu l'audio) prime sur celui du classement.
      const titre = fiche.titre;
      const [existante] = await cible.trouver("seances-audio", ["telegramId", seance.id], true);

      let slug = existante?.slug ?? slugifier(titre);
      if (!existante) {
        for (let n = 2; slugsPris.has(slug); n += 1) slug = `${slugifier(titre)}-${n}`;
      }
      slugsPris.add(slug);

      const source = fichierAudio(fiche._source);
      const nomFichier = `${slugSerie}-${slug}${path.extname(source)}`;
      console.log(`  ${seance.numero}. ${titre}  (${existante ? "mise à jour" : "création"}, ${path.basename(source)})`);
      if (!ECRIRE) continue;

      const audioExistant = existante?.audio;
      let idAudio = typeof audioExistant === "object" ? audioExistant?.id : audioExistant;
      if (!idAudio) {
        // Rejouable après un envoi interrompu : le fichier est peut-être déjà là.
        const [fichierExistant] = await cible.trouver("fichiers-audio", ["filename", nomFichier]);
        idAudio = fichierExistant?.id ?? (await cible.envoyerAudio(source, nomFichier)).id;
      }

      const data = {
        ...donneesSeance(fiche),
        titre,
        slug,
        serie: idSerie as number,
        numero: seance.numero,
        audio: idAudio,
        _status: PUBLIER ? ("published" as const) : ("draft" as const),
      };
      if (existante) {
        await cible.modifier("seances-audio", existante.id, data, !PUBLIER);
      } else {
        await cible.creer("seances-audio", data, !PUBLIER);
      }
    }
  }

  const nonClassees = [...fiches.keys()].filter((id) => !classees.has(id));
  if (nonClassees.length) console.log(`\n⚠ Fiches absentes du classement : ${nonClassees.join(", ")}`);
  process.exit(0);
}

main().catch((erreur) => {
  console.error(erreur);
  process.exit(1);
});
