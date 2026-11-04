"use server";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SOLUTION « retours des visiteurs » — côté serveur (extrait de MEDINE_INSTITUT)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * L'adaptateur `envoyer` de `retours-visiteurs.tsx` tel qu'il tourne chez
 * Médine : enregistrement dans Payload CMS (captures privées sur R2), puis
 * alerte dans un groupe Telegram **après** la réponse (`after`).
 *
 * Deuxième fichier assumé : une Server Action ne peut pas vivre dans un fichier
 * "use client". Un autre projet peut remplacer tout ce fichier par n'importe
 * quelle fonction `(FormData) => Promise<ResultatRetour>` (e-mail, tableur,
 * webhook) : c'est la seule couture entre l'interface et le stockage.
 *
 * À copier dans le projet :
 * - les deux collections (en fin de fichier) vont dans `collections/` et dans
 *   `payload.config.ts`, avec, côté stockage S3/R2, `"captures-retour": { prefix: "retours" }`
 *   **sans** `generateFileURL` ni `disablePayloadAccessControl` : les captures
 *   restent servies par Payload, qui vérifie la connexion ;
 * - puis migration + types (`payload migrate:create`, `payload generate:types`) ;
 * - variables `TELEGRAM_RETOURS_BOT_TOKEN` et `TELEGRAM_RETOURS_CHAT_ID`
 *   (facultatives : sans elles, seule l'alerte manque).
 */

import { randomUUID } from "crypto";
import { after } from "next/server";
import { headers } from "next/headers";
import type { CollectionConfig } from "payload";
// Dans le projet d'origine : `@/lib/payload` (client Payload mis en cache) et
// `@/lib/metadata` (adresse publique du site).
import { getPayloadClient } from "@/lib/payload";

/* Mêmes listes que `retours-visiteurs.tsx` (un fichier "use client" ne s'importe pas ici). */
const TYPES_RETOUR = ["neMarchePas", "pasClair", "idee", "besoin", "naimePas", "aimeBien"] as const;
const ORIGINES_RETOUR = ["bouton", "bulleGenerale", "bulleNouveaute", "bulleErreur", "page404", "pageErreur"] as const;
const LIBELLES: Record<(typeof TYPES_RETOUR)[number], string> = {
  neMarchePas: "Ça ne marche pas",
  pasClair: "Pas clair",
  idee: "Une idée",
  besoin: "Un besoin",
  naimePas: "Je n'aime pas",
  aimeBien: "J'aime bien",
};
const MAX_CAPTURES = 3;
const LIMITE_CAPTURE = 5 * 1024 * 1024;
const MAX_MESSAGE = 3000;
const MAX_COURT = 300;
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type ResultatRetour = { ok: true } | { ok: false; raison: "invalide" | "echec" | "trop" };

/* ══ Limite d'envois ═══════════════════════════════════════════════════════
 * En mémoire du processus : suffisant pour un site dans un seul conteneur. Elle
 * arrête un robot qui insiste ; le champ piège arrête les robots ordinaires.
 * Plusieurs instances : passer par Redis ou la base. */
const FENETRE = 10 * 60_000;
const MAX_PAR_FENETRE = 5;
const envois = new Map<string, number[]>();
function tropDEnvois(ip: string): boolean {
  const maintenant = Date.now();
  const recents = (envois.get(ip) ?? []).filter((t) => maintenant - t < FENETRE);
  recents.push(maintenant);
  envois.set(ip, recents);
  if (envois.size > 5000) envois.clear();
  return recents.length > MAX_PAR_FENETRE;
}

/** PNG, JPEG, WebP lus dans les premiers octets, pas dans le type annoncé par le navigateur. */
function typeImage(d: Buffer): { mime: string; ext: string } | null {
  if (d[0] === 0x89 && d[1] === 0x50 && d[2] === 0x4e && d[3] === 0x47) return { mime: "image/png", ext: "png" };
  if (d[0] === 0xff && d[1] === 0xd8 && d[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (d.subarray(0, 4).toString("ascii") === "RIFF" && d.subarray(8, 12).toString("ascii") === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

/** « Safari sur iPhone », « Chrome sur Android » : assez pour reproduire, sans la chaîne entière. */
function navigateurLisible(ua: string): string {
  const nav = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /Chrome|CriOS/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "Navigateur inconnu";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${nav} sur ${os}` : nav;
}

const texte = (v: unknown, max = MAX_COURT) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/* ══ Alerte Telegram ═══════════════════════════════════════════════════════
 * Texte brut, sans `parse_mode` : un message de visiteur peut contenir des `*`,
 * `_` ou `<` que Telegram refuserait, et tout le message serait rejeté. */
async function envoyerAlerte(message: string, photos: { data: Buffer; mimetype: string }[]): Promise<void> {
  const jeton = process.env.TELEGRAM_RETOURS_BOT_TOKEN;
  const chat = process.env.TELEGRAM_RETOURS_CHAT_ID;
  if (!jeton || !chat) return;
  const appeler = async (methode: string, corps: FormData) => {
    const r = await fetch(`https://api.telegram.org/bot${jeton}/${methode}`, { method: "POST", body: corps });
    if (!r.ok) throw new Error(`Telegram ${methode} : ${r.status} ${await r.text()}`);
  };
  // Une légende de photo est limitée à 1 024 caractères : au-delà, message séparé.
  const legendeTient = message.length <= 1024;
  const blob = (p: { data: Buffer; mimetype: string }) => new Blob([new Uint8Array(p.data)], { type: p.mimetype });
  if (photos.length > 0) {
    const corps = new FormData();
    corps.set("chat_id", chat);
    if (photos.length === 1) {
      corps.set("photo", blob(photos[0]), "capture");
      if (legendeTient) corps.set("caption", message);
      await appeler("sendPhoto", corps);
    } else {
      corps.set("media", JSON.stringify(photos.map((_, i) => ({ type: "photo", media: `attach://capture${i}`, ...(i === 0 && legendeTient ? { caption: message } : {}) }))));
      photos.forEach((p, i) => corps.set(`capture${i}`, blob(p), `capture${i}`));
      await appeler("sendMediaGroup", corps);
    }
    if (legendeTient) return;
  }
  const corps = new FormData();
  corps.set("chat_id", chat);
  corps.set("text", message);
  corps.set("link_preview_options", JSON.stringify({ is_disabled: true }));
  await appeler("sendMessage", corps);
}

/* ══ Server Action ═════════════════════════════════════════════════════════ */

/**
 * Enregistre un retour, puis prévient Telegram après la réponse : le visiteur
 * voit son « Merci » sans attendre, et une alerte qui échoue ne fait pas
 * échouer un retour déjà enregistré.
 */
export async function envoyerRetour(donnees: FormData): Promise<ResultatRetour> {
  if (texte(donnees.get("site")) !== "") return { ok: true }; // robot : on ne lui apprend rien

  const h = await headers();
  const ip = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "inconnue";
  if (tropDEnvois(ip)) return { ok: false, raison: "trop" };

  const typeBrut = texte(donnees.get("type"));
  const type = (TYPES_RETOUR as readonly string[]).includes(typeBrut) ? (typeBrut as (typeof TYPES_RETOUR)[number]) : undefined;
  const message = texte(donnees.get("message"), MAX_MESSAGE);
  if (!type && !message) return { ok: false, raison: "invalide" };
  const origineBrute = texte(donnees.get("origine"));
  const origine = (ORIGINES_RETOUR as readonly string[]).includes(origineBrute) ? origineBrute : "bouton";
  const contact = texte(donnees.get("contact"), 200);

  // Contexte remis dans sa forme : rien n'oblige un client à l'envoyer tel que le site le relève.
  let brut: Record<string, unknown> = {};
  try {
    const j = JSON.parse(String(donnees.get("contexte") ?? "{}"));
    if (j && typeof j === "object") brut = j;
  } catch {
    // Contexte illisible : le retour part sans.
  }
  const liste = (v: unknown, n: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(-n).map((x) => x.slice(0, MAX_COURT)) : []);
  const c = {
    page: texte(brut.page),
    titrePage: texte(brut.titrePage),
    section: texte(brut.section),
    parcours: liste(brut.parcours, 6),
    provenance: texte(brut.provenance),
    langue: texte(brut.langue, 10),
    ecran: texte(brut.ecran, 20),
    appliInstallee: brut.appliInstallee === true,
    erreurs: liste(brut.erreurs, 5),
    digest: texte(brut.digest, 60),
  };
  const navigateur = navigateurLisible(h.get("user-agent") ?? "");
  const largeur = Number(c.ecran.split("×")[0]);
  const appareil = !largeur ? "" : largeur < 640 ? "Téléphone" : largeur < 1024 ? "Tablette" : "Ordinateur";

  // Une image refusée est écartée, pas le retour : le texte reste utile sans elle.
  const fichiers = donnees.getAll("captures").filter((f): f is File => f instanceof File && f.size > 0 && f.size <= LIMITE_CAPTURE).slice(0, MAX_CAPTURES);
  const images: { data: Buffer; mimetype: string; nom: string }[] = [];
  for (const f of fichiers) {
    const data = Buffer.from(await f.arrayBuffer());
    const t = typeImage(data);
    // Nom tiré au hasard : il ne doit rien révéler, ni être devinable.
    if (t) images.push({ data, mimetype: t.mime, nom: `${randomUUID()}.${t.ext}` });
  }

  const payload = await getPayloadClient().catch(() => null);
  if (!payload) return { ok: false, raison: "echec" };

  const libelle = type ? LIBELLES[type] : "";
  const enregistrees: number[] = [];
  const gardees: typeof images = [];
  let id: number;
  try {
    for (const img of images) {
      try {
        const doc = await payload.create({ collection: "captures-retour", data: {}, file: { data: img.data, mimetype: img.mimetype, name: img.nom, size: img.data.length } });
        enregistrees.push(doc.id);
        gardees.push(img);
      } catch (erreur) {
        // Image jugée abîmée par Payload : le retour part sans elle.
        if (!(erreur instanceof Error && erreur.name === "ValidationError")) throw erreur;
      }
    }
    const doc = await payload.create({
      collection: "retours-visiteurs",
      data: {
        type,
        message,
        resume: [libelle, message].filter(Boolean).join(" : ").slice(0, 120),
        contact,
        captures: enregistrees,
        origine,
        page: c.page,
        section: c.section,
        titrePage: c.titrePage,
        parcours: c.parcours.join("\n"),
        provenance: c.provenance,
        appareil,
        ecran: c.ecran,
        langue: c.langue,
        navigateur,
        appliInstallee: c.appliInstallee,
        erreurs: c.erreurs.join("\n"),
        digest: c.digest,
      },
    });
    id = doc.id;
  } catch (erreur) {
    console.error("[retours] retour non enregistré :", erreur);
    await Promise.all(enregistrees.map((i) => payload.delete({ collection: "captures-retour", id: i }).catch(() => undefined)));
    return { ok: false, raison: "echec" };
  }

  const lignes = [
    libelle || "Retour",
    message ? `« ${message} »` : "(aucun texte)",
    "",
    `Page : ${c.page || "?"}`,
    c.section && `Section à l'écran : ${c.section}`,
    c.parcours.length > 1 && `Avant : ${c.parcours.slice(0, -1).join(" puis ")}`,
    c.provenance && `Venu de : ${c.provenance}`,
    [appareil, navigateur, c.ecran].filter(Boolean).join(", "),
    c.appliInstallee && "Depuis l'application installée",
    c.erreurs.length > 0 && `Erreurs : ${c.erreurs.join(" | ")}`,
    `Contact : ${contact || "aucun"}`,
    "",
    `${SITE}/admin/collections/retours-visiteurs/${id}`,
  ].filter((l): l is string => typeof l === "string");
  after(async () => {
    try {
      await envoyerAlerte(lignes.join("\n"), gardees);
    } catch (erreur) {
      console.error("[retours] alerte Telegram non envoyée :", erreur);
    }
  });

  return { ok: true };
}

/* ══ Collections Payload ═══════════════════════════════════════════════════
 * À déplacer dans `collections/` (un fichier "use server" n'exporte que des
 * fonctions asynchrones : ces objets ne peuvent pas rester exportés ici, ils
 * sont gardés en référence). `isAdmin` / `isLoggedIn` : règles d'accès du projet. */

const isLoggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user);
const isAdmin = isLoggedIn; // Médine : rôle « admin » vérifié dans `lib/access.ts`.

/** Captures jointes. Jamais publiques : une capture peut montrer un nom ou un formulaire rempli. */
const CapturesRetour: CollectionConfig = {
  slug: "captures-retour",
  labels: { singular: "Capture d'un retour", plural: "Captures des retours" },
  admin: { group: "Retours", defaultColumns: ["filename", "createdAt"] },
  access: { read: isLoggedIn, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    // Le plugin de stockage ajoute ce champ en prod mais pas en dev : déclaré ici, la migration l'a partout.
    { name: "prefix", type: "text", defaultValue: "retours", admin: { hidden: true, readOnly: true } },
  ],
  upload: { staticDir: "media/captures-retour", mimeTypes: ["image/png", "image/jpeg", "image/webp"] },
};

/** Les retours. Écriture par l'API locale seulement (la Server Action), lecture réservée aux connectés. */
const RetoursVisiteurs: CollectionConfig = {
  slug: "retours-visiteurs",
  labels: { singular: "Retour d'un visiteur", plural: "Retours des visiteurs" },
  admin: { group: "Retours", useAsTitle: "resume", defaultColumns: ["resume", "type", "page", "appareil", "traite", "createdAt"] },
  access: { read: isLoggedIn, create: isAdmin, update: isAdmin, delete: isAdmin },
  defaultSort: "-createdAt",
  fields: [
    { name: "traite", type: "checkbox", defaultValue: false, label: "Traité", admin: { position: "sidebar" } },
    { name: "type", type: "select", label: "C'est à propos de", options: TYPES_RETOUR.map((v) => ({ label: LIBELLES[v], value: v })) },
    { name: "message", type: "textarea", label: "Message" },
    { name: "resume", type: "text", label: "Résumé", admin: { hidden: true } },
    { name: "contact", type: "text", label: "Pour lui répondre" },
    { name: "captures", type: "upload", relationTo: "captures-retour", hasMany: true, label: "Captures d'écran" },
    {
      type: "collapsible",
      label: "Contexte relevé par le site",
      fields: [
        { name: "origine", type: "select", label: "Ouvert depuis", options: ORIGINES_RETOUR.map((v) => ({ label: v, value: v })) },
        { type: "row", fields: [{ name: "page", type: "text", label: "Page" }, { name: "section", type: "text", label: "Section à l'écran" }] },
        { name: "titrePage", type: "text", label: "Titre de la page" },
        { name: "parcours", type: "textarea", label: "Pages vues avant" },
        { name: "provenance", type: "text", label: "Venu de" },
        { type: "row", fields: [{ name: "appareil", type: "text", label: "Appareil" }, { name: "ecran", type: "text", label: "Taille d'écran" }, { name: "langue", type: "text", label: "Langue" }] },
        { name: "navigateur", type: "text", label: "Navigateur" },
        { name: "appliInstallee", type: "checkbox", label: "Depuis l'application installée" },
        { name: "erreurs", type: "textarea", label: "Erreurs survenues dans la page" },
        { name: "digest", type: "text", label: "Référence de l'erreur" },
      ],
    },
  ],
};

// Référence seulement (voir plus haut) : à exporter depuis `collections/` dans le projet.
void CapturesRetour;
void RetoursVisiteurs;
