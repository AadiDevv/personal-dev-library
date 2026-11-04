"""Chaîne de préparation des cours audio d'un canal Telegram, de l'audio brut à la
fiche JSON prête à importer dans un CMS. Cinq étapes, une sous-commande chacune.

Origine : MEDINE_INSTITUT, dossier d'outillage hors dépôt `telegram-ogg-dl/`
(download_ogg.py, inventaire.py, convertir.py, analyse.py, regroupement.py),
aplatis ici sans changer leur logique. Seule adaptation : les identifiants
Telegram sont lus à la demande (`config_telegram`), pour que `convertir`,
`analyser` et `regrouper` tournent sans eux.

Usage, depuis le dossier de travail (il contient `.env`, `ogg/`, `m4a/`,
`fiches/`, `inventaire.csv`, `series.json`) :

    .venv/bin/python pipeline.py telecharger [dossier_sortie]
    .venv/bin/python pipeline.py inventaire
    .venv/bin/python pipeline.py convertir [--sortie DOSSIER] [<id> …]
    [GEMINI_MODELE=…] .venv/bin/python pipeline.py analyser [--inverse] [<id> …]
    .venv/bin/python pipeline.py regrouper

Dépendances : telethon, python-dotenv, cryptg (accélère Telethon), google-genai ;
ffmpeg et ffprobe installés sur la machine.
`.env` : TG_API_ID, TG_API_HASH, TG_CHANNEL, GEMINI_API_KEY.
"""
import asyncio
import csv
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

ICI = Path(__file__).parent
load_dotenv(ICI / ".env")


# ─────────────────────────────────────────────────────────────────────────────
# Étape 1 — Téléchargement des audios du canal (ex download_ogg.py)
# ─────────────────────────────────────────────────────────────────────────────

def config_telegram() -> tuple[int, str, str, str]:
    """Identifiants Telegram et canal ; la session est un fichier `session.session`
    à côté du script, créé à la première connexion (code reçu sur Telegram)."""
    return (int(os.environ["TG_API_ID"]), os.environ["TG_API_HASH"],
            os.environ.get("TG_CHANNEL", "medineinstitut"), str(ICI / "session"))


def safe_name(name: str) -> str:
    """Retire les caractères interdits dans un nom de fichier."""
    return re.sub(r'[\\/:*?"<>|\x00-\x1f]', "_", name).strip() or "sans_nom.ogg"


def target_path(msg, out_dir: Path) -> Path:
    """Nom d'origine, ou date_id.ogg pour un vocal (qui n'a pas de nom) ;
    suffixé par l'id du message si un autre fichier du même nom existe déjà."""
    name = safe_name(msg.file.name or f"{msg.date:%Y-%m-%d}_{msg.id}.ogg")
    path = out_dir / name
    if path.exists() and path.stat().st_size != msg.file.size:
        path = path.with_name(f"{path.stem} ({msg.id}){path.suffix}")
    return path


async def telecharger(args: list[str]) -> None:
    """Télécharge tous les .ogg du canal (compte utilisateur, via Telethon).
    Relançable : les fichiers déjà complets sont ignorés, un téléchargement
    interrompu (.part) est repris de zéro."""
    from telethon import TelegramClient

    api_id, api_hash, channel, session = config_telegram()
    out_dir = Path(args[0] if args else "ogg")
    out_dir.mkdir(parents=True, exist_ok=True)
    async with TelegramClient(session, api_id, api_hash) as client:
        # Pas de filtre serveur : les vocaux et les audios « fichier » relèvent de
        # deux filtres Telegram distincts, on trie donc nous-mêmes sur le type.
        msgs = [
            m async for m in client.iter_messages(channel)
            if m.file and m.file.mime_type == "audio/ogg"
        ]
        msgs.reverse()  # du plus ancien au plus récent
        total = len(msgs)
        print(f"{total} fichiers .ogg trouvés dans {channel}")

        done = skipped = failed = 0
        for i, msg in enumerate(msgs, 1):
            path = target_path(msg, out_dir)
            prefix = f"[{i}/{total}]"
            if path.exists() and path.stat().st_size == msg.file.size:
                skipped += 1
                print(f"{prefix} déjà présent : {path.name}")
                continue

            def progress(received: int, size: int) -> None:
                pct = received * 100 // size if size else 0
                print(f"\r{prefix} {path.name}  {pct:3d}%  "
                      f"{received / 1e6:.1f}/{size / 1e6:.1f} Mo", end="", flush=True)

            # Écriture dans un .part puis renommage : un fichier final est forcément complet.
            part = path.with_name(path.name + ".part")
            try:
                await client.download_media(msg, file=str(part), progress_callback=progress)
                part.replace(path)
                done += 1
                print()
            except Exception as e:  # on continue sur les autres fichiers
                failed += 1
                part.unlink(missing_ok=True)
                print(f"\n{prefix} ÉCHEC {path.name} : {e}")

        print(f"\nTerminé : {done} téléchargés, {skipped} ignorés, {failed} échecs → {out_dir.resolve()}")


# ─────────────────────────────────────────────────────────────────────────────
# Étape 2 — Inventaire : le contexte Telegram de chaque audio (ex inventaire.py)
# ─────────────────────────────────────────────────────────────────────────────

VOISINS = 3  # messages texte retenus avant et après chaque audio


def texte(m) -> str:
    return " ".join((m.message or "").split())


async def inventaire(_args: list[str]) -> None:
    """Un CSV avec, pour chaque audio, le texte des messages voisins (l'enseignant
    annonce souvent le cours juste avant). Sortie : inventaire.csv."""
    from telethon import TelegramClient

    api_id, api_hash, channel, session = config_telegram()
    async with TelegramClient(session, api_id, api_hash) as client:
        msgs = [m async for m in client.iter_messages(channel)]
    msgs.reverse()  # chronologique

    rows = []
    for i, m in enumerate(msgs):
        if not (m.file and m.file.mime_type == "audio/ogg"):
            continue
        # Fichier tel que nommé par l'étape 1 (hors cas de collision de nom).
        fichier = safe_name(m.file.name or f"{m.date:%Y-%m-%d}_{m.id}.ogg")
        # En cas de nom déjà pris, l'étape 1 a suffixé l'id du message.
        suffixe = Path(fichier).stem + f" ({m.id})" + Path(fichier).suffix
        if (ICI / "ogg" / suffixe).exists():
            fichier = suffixe
        avant = [texte(x) for x in msgs[max(0, i - VOISINS):i] if texte(x)]
        apres = [texte(x) for x in msgs[i + 1:i + 1 + VOISINS] if texte(x)]
        rows.append({
            "id": m.id,
            "date": f"{m.date:%Y-%m-%d %H:%M}",
            "fichier": fichier,
            "duree_min": round((m.file.duration or 0) / 60, 1),
            "legende": texte(m),
            "messages_avant": " | ".join(avant),
            "messages_apres": " | ".join(apres),
        })

    out = ICI / "inventaire.csv"
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} audios sur {len(msgs)} messages → {out}")


# ─────────────────────────────────────────────────────────────────────────────
# Étape 3 — Conversion .ogg → .m4a avec réglage du son (ex convertir.py)
# ─────────────────────────────────────────────────────────────────────────────

DEBIT = "80k"
# Réglage choisi à l'écoute le 2026-10-15 : coupe des graves parasites et de
# l'aigu inutile à la voix ; débruitage modéré, qui garde les aigus (le réglage
# afftdn=nf=-25 en retirait 4 dB et étouffait la voix) ; résonance artificielle
# très légère (3 réflexions courtes) ; volume homogène d'un cours à l'autre.
# La résonance vient après le débruitage, qui l'effacerait.
FILTRES = ["highpass=f=80", "lowpass=f=12000", "afftdn=nr=10:nf=-33:tn=1",
           "aecho=1.0:0.9:23|41|67:0.10|0.06|0.035",
           "loudnorm=I=-16:TP=-1.5:LRA=11"]
ECART_MAX_S = 0.5


def duree(fichier: Path) -> float:
    sortie = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(fichier)],
        capture_output=True, text=True, check=True)
    return float(sortie.stdout)


def convertir(args: list[str]) -> None:
    """Convertit les .ogg en .m4a (AAC mono), lisible partout, Safari compris.
    Sortie : <DOSSIER>/<nom du .ogg>.m4a (défaut : m4a/). Les originaux ne sont
    jamais modifiés et un fichier déjà converti n'est jamais écrasé.

    Chaque conversion est contrôlée : une durée qui s'écarte de plus d'une
    demi-seconde de l'original est signalée (les minutages des fiches en dépendent)."""
    sortie = ICI / "m4a"
    if "--sortie" in args:
        i = args.index("--sortie")
        sortie = Path(args[i + 1])
        del args[i:i + 2]
    sortie.mkdir(parents=True, exist_ok=True)

    rows = list(csv.DictReader((ICI / "inventaire.csv").open(encoding="utf-8")))
    if args:
        rows = [r for r in rows if r["id"] in set(args)]

    alertes = 0
    for i, row in enumerate(rows, 1):
        source = ICI / "ogg" / row["fichier"]
        cible = sortie / (Path(row["fichier"]).stem + ".m4a")
        prefix = f"[{i}/{len(rows)}] {row['id']}"
        if cible.exists():
            print(f"{prefix} déjà converti")
            continue
        partiel = cible.with_suffix(".part.m4a")
        subprocess.run(
            ["ffmpeg", "-v", "error", "-n", "-i", str(source), "-af", ",".join(FILTRES),
             "-ac", "1", "-c:a", "aac", "-b:a", DEBIT, "-movflags", "+faststart",
             str(partiel)],
            check=True)
        partiel.rename(cible)
        avant, apres = duree(source), duree(cible)
        ecart = apres - avant
        signal = "  ⚠ ÉCART DE DURÉE" if abs(ecart) > ECART_MAX_S else ""
        alertes += bool(signal)
        print(f"{prefix} {avant:.2f} s → {apres:.2f} s (écart {ecart:+.2f} s), "
              f"{source.stat().st_size / 1e6:.1f} → {cible.stat().st_size / 1e6:.1f} Mo{signal}")
    if alertes:
        print(f"{alertes} fichier(s) à vérifier")


# ─────────────────────────────────────────────────────────────────────────────
# Étape 4 — Analyse, passe 1 : une fiche JSON par audio (ex analyse.py)
# ─────────────────────────────────────────────────────────────────────────────

# Chaque modèle a son propre quota gratuit : un 2e processus peut tourner avec un autre.
MODELE = os.environ.get("GEMINI_MODELE", "gemini-3.8-flash")

PROMPT_FICHE = """Tu analyses l'enregistrement d'un cours de sciences islamiques donné en live
sur Telegram par un enseignant de Médine Institut. Produis la fiche du cours en
français, au format JSON imposé.

Contexte Telegram (messages publiés autour de l'audio, peut aider à identifier
la série et le titre) :
{contexte}

Règles absolues :
- N'écris rien qui ne soit pas dit dans l'audio. N'ajoute aucune connaissance
  personnelle. Une rubrique sans contenu dans l'audio reste une liste vide.
- L'enseignant alterne souvent un passage en arabe puis sa traduction en
  français : ce sont deux versions du même contenu, traite-les une seule fois.
- Versets et hadiths : donne seulement la référence si elle est dite (sourate et
  verset, recueil). Ne recopie jamais un texte arabe entendu, ne complète jamais
  une référence.
- Orthographe : tout le texte français s'écrit avec ses accents normaux
  (séance, définition, règle, interprétation, étudié, à, où). Seuls les mots
  arabes translittérés n'ont pas d'accents ni de diacritiques (tawhid
  al-uluhiyya, sira, usul al-fiqh), en minuscules sauf noms propres. Dans le résumé, à la première
  occurrence d'un terme technique, ajoute entre parenthèses l'écriture arabe et
  le sens : « tawhid al-uluhiyya (توحيد الألوهية, l'unicité dans l'adoration) ».
- Ton sobre et factuel, vouvoiement si tu t'adresses au lecteur, pas
  d'exclamation ni de superlatif.
- Signale dans points_incertains tout passage inaudible, nom ou terme dont tu
  n'es pas sûr, ou toute hésitation sur la série. Si l'enseignant oublie un nom
  ou une référence, note-le sans le compléter toi-même.
- Le Prophète : écris « le Prophète ﷺ » (formule ﷺ après chaque mention).

Rubriques :
- titre : titre court et précis de la séance (sans le nom de la série).
- serie_probable : sujet de la série (ex. Sira, Aqida, Usul al-fiqh, Fiqh de la
  priere…), déduit de l'audio et du contexte.
- numero_annonce : numéro de séance s'il est annoncé (audio ou contexte), sinon "".
- langues : langues parlées dans l'audio.
- resume : 3 à 5 phrases sur ce que le cours enseigne.
- themes : 3 à 6 thèmes abordés.
- plan : repères de navigation (voir « Règles du plan »).
- lexique : uniquement les notions techniques que l'enseignant DÉFINIT ou
  explique dans l'audio (translit, arabe, sens, temps, citation). Le sens
  reprend l'explication de l'enseignant, sans la compléter par tes propres
  connaissances ; un terme seulement prononcé, sans explication, n'entre pas
  dans le lexique. temps : minutage du début de cette explication (même format
  que le plan). citation : les mots de l'enseignant qui donnent ce sens, en
  français, tels qu'il les dit (une phrase, 25 mots au plus) ; s'il ne
  l'explique qu'en arabe, ta traduction fidèle de son explication, signalée
  dans points_incertains. Si tu ne trouves pas de tels mots, n'inclus pas la
  notion.
- dates : dates et événements cités.
- personnages : uniquement les personnes dont le cours raconte la vie ou un
  épisode (typiquement en sira ou en histoire), avec le minutage de leur première
  mention. Pas les noms cités en passant, en exemple ou comme autorité. Dans un
  cours de aqida, de fiqh ou d'usul, cette liste est généralement vide.
- ouvrages : uniquement les livres que l'enseignant NOMME explicitement dans
  l'audio, avec le minutage de la mention et leur rôle (« texte étudié » s'il
  s'agit du livre commenté pendant le cours, sinon « cité »). Ne déduis jamais un
  livre du sujet traité.
- references : versets et hadiths cités (référence seulement).
- points_incertains : voir plus haut.

Règles du plan (le plus important : l'auditeur clique sur un repère et doit
entendre immédiatement ce que le titre annonce) :
- Un repère = un sujet que l'auditeur pourrait vouloir retrouver directement.
- Le titre doit être vrai dès le minutage indiqué : il décrit ce qu'on entend
  dans la minute qui suit. N'annonce jamais dans un titre un sujet qui n'arrive
  que plus tard.
- Si un titre réunirait deux sujets (« A et B ») et que B commence plus d'une
  minute et demie après A, fais deux repères. Si A et B sont traités ensemble,
  entremêlés, garde un seul repère.
- Au moins une minute entre deux repères. Aucun repère ne doit couvrir plus de
  7 minutes : au-delà, cherche le moment où l'enseignant passe à un nouveau
  point (une nouvelle catégorie, un exemple, une question) et découpe là.
- Deux minutages par repère, car l'enseignant dit souvent un passage en arabe
  puis le reprend en français :
  - debut_ar : début du passage en arabe sur ce sujet ;
  - debut_fr : début de la reprise ou de l'explication en français.
  Si le sujet n'est traité que dans une langue, laisse l'autre minutage vide ("").
- Minutage précis à la seconde, au début de la phrase qui ouvre le sujet
  (format "MM:SS", ou "H:MM:SS" au-delà d'une heure).
"""

LISTE = {"type": "array", "items": {"type": "string"}}
SCHEMA_FICHE = {
    "type": "object",
    "properties": {
        "titre": {"type": "string"},
        "serie_probable": {"type": "string"},
        "numero_annonce": {"type": "string"},
        "langues": LISTE,
        "resume": {"type": "string"},
        "themes": LISTE,
        "plan": {"type": "array", "items": {"type": "object", "properties": {
            "titre": {"type": "string"}, "debut_ar": {"type": "string"},
            "debut_fr": {"type": "string"}},
            "required": ["titre", "debut_ar", "debut_fr"]}},
        "lexique": {"type": "array", "items": {"type": "object", "properties": {
            "translit": {"type": "string"}, "arabe": {"type": "string"},
            "sens": {"type": "string"}, "temps": {"type": "string"},
            "citation": {"type": "string"}},
            "required": ["translit", "arabe", "sens", "temps", "citation"]}},
        "dates": {"type": "array", "items": {"type": "object", "properties": {
            "date": {"type": "string"}, "evenement": {"type": "string"}},
            "required": ["date", "evenement"]}},
        "personnages": {"type": "array", "items": {"type": "object", "properties": {
            "nom": {"type": "string"}, "temps": {"type": "string"}},
            "required": ["nom", "temps"]}},
        "ouvrages": {"type": "array", "items": {"type": "object", "properties": {
            "titre": {"type": "string"}, "role": {"type": "string",
            "enum": ["texte étudié", "cité"]}, "temps": {"type": "string"}},
            "required": ["titre", "role", "temps"]}},
        "references": LISTE,
        "points_incertains": LISTE,
    },
    "required": ["titre", "serie_probable", "numero_annonce", "langues", "resume",
                 "themes", "plan", "lexique", "dates", "personnages", "ouvrages",
                 "references", "points_incertains"],
}


def secondes(t: str) -> int | None:
    if not t:
        return None
    parts = [int(x) for x in t.split(":")]
    return sum(v * 60 ** i for i, v in enumerate(reversed(parts)))


def controles(fiche: dict, duree_s: int) -> list[str]:
    """Écarts aux règles du plan et de l'orthographe, à relire en priorité."""
    alertes = []
    debuts = [min(x for x in (secondes(p["debut_ar"]), secondes(p["debut_fr"]))
                  if x is not None) for p in fiche["plan"]]
    fins = debuts[1:] + [duree_s]
    for p, d, f in zip(fiche["plan"], debuts, fins):
        if f - d > 7 * 60:
            alertes.append(f"repère de {(f - d) // 60} min : {p['titre']}")
        if f - d < 60:
            alertes.append(f"repère de moins d'une minute : {p['titre']}")
        ar, fr = secondes(p["debut_ar"]), secondes(p["debut_fr"])
        if ar is not None and fr is not None and fr < ar:
            alertes.append(f"français avant l'arabe : {p['titre']}")
    if not any(c in fiche["resume"] for c in "éèàù"):
        alertes.append("résumé sans aucun accent")
    return alertes


def contexte(row: dict) -> str:
    return "\n".join(f"{k} : {row[k] or '(vide)'}"
                     for k in ("date", "legende", "messages_avant", "messages_apres"))


def analyser_un(client, row: dict) -> dict:
    from google.genai import types

    audio = client.files.upload(file=ICI / "ogg" / row["fichier"],
                                config={"mime_type": "audio/ogg"})
    # Le fichier reste en PROCESSING quelques secondes après l'upload.
    while audio.state == "PROCESSING":
        time.sleep(3)
        audio = client.files.get(name=audio.name)
    if audio.state != "ACTIVE":
        raise RuntimeError(f"upload refusé : {audio.state}")
    try:
        rep = client.models.generate_content(
            model=MODELE,
            contents=[audio, PROMPT_FICHE.format(contexte=contexte(row))],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=SCHEMA_FICHE,
            ),
        )
        fiche = json.loads(rep.text)
        fiche["_source"] = {"id": int(row["id"]), "fichier": row["fichier"],
                            "date": row["date"], "duree_min": float(row["duree_min"]),
                            "modele": MODELE, "tokens": rep.usage_metadata.total_token_count}
        fiche["_controles"] = controles(fiche, round(float(row["duree_min"]) * 60))
        return fiche
    finally:
        client.files.delete(name=audio.name)


def analyser(args: list[str]) -> None:
    """Une fiche JSON par audio, générée par Gemini à partir de l'audio brut.
    Ids : colonne « id » de inventaire.csv ; sans id = tous. Sortie :
    fiches/<id>.json — un audio déjà analysé est ignoré."""
    from google import genai

    rows = list(csv.DictReader((ICI / "inventaire.csv").open(encoding="utf-8")))
    if "--inverse" in args:  # part de la fin, pour ne pas croiser un processus parallèle
        args.remove("--inverse")
        rows.reverse()
    ids = set(args)
    if ids:
        rows = [r for r in rows if r["id"] in ids]
    out = ICI / "fiches"
    out.mkdir(exist_ok=True)
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    for i, row in enumerate(rows, 1):
        cible = out / f"{row['id']}.json"
        prefix = f"[{i}/{len(rows)}] {row['id']} ({row['duree_min']} min)"
        if cible.exists():
            print(f"{prefix} déjà analysé")
            continue
        print(f"{prefix} analyse…", flush=True)
        for essai in range(1, 7):
            try:
                fiche = analyser_un(client, row)
                break
            except Exception as e:
                # Quota du jour épuisé : inutile de continuer, la relance reprendra ici.
                if "PerDay" in str(e):
                    print(f"{prefix} quota du jour épuisé, arrêt")
                    return
                # 503 « high demand » : surcharge passagère, on patiente de plus en plus.
                print(f"{prefix} essai {essai}/6 échoué : {str(e)[:120]}")
                fiche = None
                time.sleep(min(60 * 2 ** (essai - 1), 900))
        if fiche is None:
            continue
        cible.write_text(json.dumps(fiche, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"{prefix} → {fiche['serie_probable']} / {fiche['titre']}"
              f"  ({fiche['_source']['tokens']} tokens)")
        for a in fiche["_controles"]:
            print(f"    ⚠ {a}")


# ─────────────────────────────────────────────────────────────────────────────
# Étape 5 — Analyse, passe 2 : regroupement en séries (ex regroupement.py)
# ─────────────────────────────────────────────────────────────────────────────

PROMPT_SERIES = """Voici les fiches de {n} cours audio donnés en live sur Telegram par un
enseignant de Médine Institut (une fiche par audio, avec sa date, la série que
l'analyse individuelle a supposée, le numéro annoncé, le titre et le contexte des
messages Telegram voisins).

Regroupe ces audios en séries. Une série = un même sujet enseigné sur plusieurs
séances (par exemple Sira, Aqida, Usul al-fiqh, Fiqh de la purification…).
- Les séries de l'analyse individuelle sont des indices, pas des vérités : deux
  libellés différents peuvent désigner la même série (« Aqida » et « Noms et
  attributs »), un même libellé peut couvrir deux séries distinctes.
- Plusieurs séries ont été menées en parallèle, souvent un jour de la semaine
  chacune (« la rediffusion du cours de samedi (3) ») : sers-toi des jours, des
  numéros et de la continuité des sujets.
- Ordonne les séances de chaque série dans l'ordre d'enseignement (date, numéro
  annoncé, enchaînement logique).
- Un audio isolé (annonce, conseil, cours sans suite) va dans une série
  « Cours isolés ».
- Range chaque série dans un thème large (Aqida, Sira, Hadith, Fiqh, Usul al-fiqh,
  Mustalah al-hadith…) : plusieurs séries peuvent partager un thème. « Cours
  isolés » a pour thème « Divers ».
- Nom de série court. Le français s'écrit avec ses accents normaux (série,
  prière, prophétique, isolés) ; seuls les termes arabes translittérés n'en ont pas.
  Même règle pour la description et pour a_verifier.
  Description : 2 phrases factuelles sur ce que la série enseigne, déduites des
  fiches uniquement.
- Dans a_verifier, liste chaque rattachement dont tu n'es pas sûr, avec la raison.

Fiches :
{fiches}
"""

SCHEMA_SERIES = {
    "type": "object",
    "properties": {
        "series": {"type": "array", "items": {"type": "object", "properties": {
            "nom": {"type": "string"},
            "theme": {"type": "string"},
            "description": {"type": "string"},
            "seances": {"type": "array", "items": {"type": "object", "properties": {
                "id": {"type": "integer"}, "numero": {"type": "integer"},
                "titre": {"type": "string"}},
                "required": ["id", "numero", "titre"]}},
        }, "required": ["nom", "theme", "description", "seances"]}},
        "a_verifier": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["series", "a_verifier"],
}


def regrouper(_args: list[str]) -> None:
    """Regroupe toutes les fiches en séries et ordonne les séances (texte seul).
    Sortie : series.json (proposition à relire) + series.csv (une ligne par séance)."""
    from google import genai
    from google.genai import types

    inv = {r["id"]: r for r in csv.DictReader(
        (ICI / "inventaire.csv").open(encoding="utf-8"))}
    fiches = [json.loads(p.read_text(encoding="utf-8"))
              for p in sorted((ICI / "fiches").glob("*.json"))]
    resumes = []
    for f in sorted(fiches, key=lambda f: f["_source"]["date"]):
        src = f["_source"]
        ligne = inv[str(src["id"])]
        resumes.append({
            "id": src["id"], "date": src["date"], "duree_min": src["duree_min"],
            "serie_supposee": f["serie_probable"], "numero_annonce": f["numero_annonce"],
            "titre": f["titre"], "themes": f["themes"],
            "contexte_telegram": " | ".join(x for x in (
                ligne["legende"], ligne["messages_avant"], ligne["messages_apres"]) if x)[:600],
        })

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    rep = client.models.generate_content(
        model=MODELE,
        contents=PROMPT_SERIES.format(n=len(resumes),
                                      fiches=json.dumps(resumes, ensure_ascii=False, indent=1)),
        config=types.GenerateContentConfig(response_mime_type="application/json",
                                           response_json_schema=SCHEMA_SERIES),
    )
    res = json.loads(rep.text)
    (ICI / "series.json").write_text(json.dumps(res, ensure_ascii=False, indent=2),
                                     encoding="utf-8")

    par_id = {f["_source"]["id"]: f for f in fiches}
    vus = set()
    with (ICI / "series.csv").open("w", newline="", encoding="utf-8") as out:
        w = csv.writer(out)
        w.writerow(["theme", "serie", "numero", "id", "date", "duree_min", "titre", "alertes"])
        for s in res["series"]:
            for se in sorted(s["seances"], key=lambda x: x["numero"]):
                f = par_id.get(se["id"])
                vus.add(se["id"])
                w.writerow([s["theme"], s["nom"], se["numero"], se["id"],
                            f["_source"]["date"] if f else "?",
                            f["_source"]["duree_min"] if f else "?", se["titre"],
                            len(f.get("_controles", [])) if f else "id inconnu"])

    manquants = set(par_id) - vus
    print(f"{len(res['series'])} séries, {len(vus)} séances classées"
          + (f", NON classées : {sorted(manquants)}" if manquants else ""))
    for s in res["series"]:
        print(f"  {s['theme']} › {s['nom']} : {len(s['seances'])} séances")
    for a in res["a_verifier"]:
        print(f"  ? {a}")


ETAPES = {
    "telecharger": lambda a: asyncio.run(telecharger(a)),
    "inventaire": lambda a: asyncio.run(inventaire(a)),
    "convertir": convertir,
    "analyser": analyser,
    "regrouper": regrouper,
}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ETAPES:
        sys.exit(f"Étapes : {' | '.join(ETAPES)}  (voir l'en-tête du fichier)")
    ETAPES[sys.argv[1]](sys.argv[2:])
