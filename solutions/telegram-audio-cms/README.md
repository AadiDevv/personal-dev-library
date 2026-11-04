# Telegram → Gemini → CMS : publier des cours audio

Chaîne qui récupère les audios d'un canal Telegram, les convertit, en tire une
**fiche structurée par IA** (résumé, plan minuté, notions…), les range en séries
et les importe en **brouillon** dans Payload CMS.

- **Origine** : `MEDINE_INSTITUT` (Next.js App Router + Payload CMS, R2), rubrique
  « Cours gratuits » : 49 audios de cours en live (42,6 h) mis en ligne le
  2026-10-16. Outillage d'origine hors dépôt (`~/Documents/telegram-ogg-dl/`) +
  `scripts/import-cours-gratuits.ts` du site.
- **Fichiers** — deux langages, donc deux fichiers (exception assumée à la règle
  « un seul fichier ») :
  - `pipeline.py` : les étapes 1 à 5, une sous-commande chacune (aplatissement
    de 5 scripts, logique inchangée) ;
  - `import-payload.ts` : l'étape 6, copie conforme du script d'import du site.
- **Doc vécue** : Notion › Knowledge Base › Workflows & Méthodes › « [Cours audio
  Telegram → site : la chaîne complète](https://app.notion.com/p/3ff86687ea01816d8a64fe55f589d545) ».

## 1. Le problème que ça résout

Un enseignant donne ses cours en live sur Telegram. Il reste des dizaines
d'audios d'une heure, nommés `record (1019).ogg`, sans titre, sans ordre, au
milieu de 1 500 messages. Les mettre sur un site à la main veut dire tout
écouter, découper, titrer, classer.

Ici, l'IA fait le gros du travail et l'humain relit : chaque audio devient une
séance avec un résumé, un plan cliquable et ses notions, rangée dans sa série.

## 2. Les étapes

Toutes relançables : un fichier déjà produit n'est jamais refait.

| # | Commande | Entrée → sortie | Ce qui compte |
|---|---|---|---|
| 1 | `telecharger` | canal → `ogg/` | Telethon avec un **compte utilisateur** (pas un bot : un bot ne peut pas relire l'historique d'un canal). Écriture en `.part` puis renommage. |
| 2 | `inventaire` | canal → `inventaire.csv` | Pour chaque audio : id du message, date, durée, légende et **3 messages texte avant/après**. L'enseignant y annonce souvent « cours n°3 » : indice gratuit pour l'IA. |
| 3 | `convertir` | `ogg/` → `m4a/` | AAC mono 80k : Safari/iOS ne lit pas l'Ogg Opus de façon fiable. Filtres réglés **à l'oreille**. Contrôle de durée : les minutages des fiches en dépendent. |
| 4 | `analyser` | `.ogg` + contexte → `fiches/<id>.json` | Gemini lit l'**audio brut** (Files API, > 20 Mo). Sortie imposée par schéma JSON. Contrôles automatiques ajoutés à la fiche (`_controles`). |
| 5 | `regrouper` | toutes les fiches → `series.json` | Une requête texte seule sur l'ensemble : séries, thèmes, ordre des séances, liste `a_verifier`. |
| 6 | `import-payload.ts` | fiches + classement → CMS | Simulation par défaut ; `--ecrire` ; `--url` pour viser un site déployé par son API REST. Brouillon sauf `--publier`. |

Puis **relecture dans l'admin**, et publication.

```bash
cd ~/Documents/telegram-ogg-dl     # dossier de travail, hors dépôt
.venv/bin/python pipeline.py telecharger
.venv/bin/python pipeline.py inventaire
.venv/bin/python pipeline.py convertir
.venv/bin/python pipeline.py analyser          # long : un appel Gemini par audio
.venv/bin/python pipeline.py regrouper         # puis relire series.json
# depuis le projet Next.js :
npm run import:cours-gratuits                  # simulation
set -a; . ~/.medine-preprod.env; set +a
npm run import:cours-gratuits -- --url https://… --ecrire
```

## 3. Les points non évidents

| Point | Pourquoi |
|---|---|
| Prompt « n'écris rien qui ne soit pas dans l'audio » | Sur du contenu religieux, une référence complétée par le modèle est pire qu'une rubrique vide. Une liste `points_incertains` obligatoire donne au relecteur où regarder. |
| Notions avec `temps` + `citation` | Sans citation, impossible de distinguer une définition de l'enseignant d'une définition ajoutée par le modèle. Pas de citation → la notion n'entre pas. |
| Deux minutages par repère (`debut_ar`, `debut_fr`) | L'enseignant dit un passage en arabe puis le reprend en français : l'auditeur choisit sa langue. |
| Règles du plan (≥ 1 min, ≤ 7 min, titre vrai dès la seconde indiquée) | Un repère sert à cliquer et entendre tout de suite le sujet annoncé. `controles()` vérifie ces règles après coup : l'IA ne les respecte pas toujours. |
| Arrêt sur `PerDay` | Quota quotidien épuisé : inutile d'insister, la relance du lendemain reprend où on en était. Les autres erreurs (503) sont retentées avec attente croissante. |
| `GEMINI_MODELE` en variable | Chaque modèle a son propre quota gratuit : deux processus en parallèle, dont un en `--inverse`. |
| Import par l'**API REST** du site (`--url`) | Pas de chaîne de connexion à la base de prod sur le poste : c'est le serveur qui écrit dans sa base, range le fichier dans R2 et revalide son cache. En-tête `Origin` obligatoire, sinon Payload jette la session. |
| Séances retrouvées par `telegramId` | Rend l'import rejouable, et permet de savoir quels messages sont déjà en ligne sans fichier d'état. |
| Slugs sans mots vides | « Les quarante hadiths d'an-Nawawi » → `quarante-hadiths-nawawi`. Le fichier audio est renommé `<serie>-<seance>.m4a` : le nom Telegram ne dit rien. |

## 4. Contrat fiche JSON ↔ Payload

| Fiche JSON | Champ Payload | Note |
|---|---|---|
| `titre`, `resume` | `titre`, `resume` | texte |
| `themes[]`, `references[]` | `themes`, `references` | texte `hasMany` |
| `plan[] {titre, debut_ar, debut_fr}` | `plan[] {titre, debutAr, debutFr}` | minutages convertis en **secondes** ; `""` → vide |
| `lexique[] {translit, arabe, sens, temps, citation}` | `lexique[] {translit, arabe, sens}` | `temps` et `citation` pas encore stockés côté site |
| `dates[] {date, evenement}` | `dates[]` | `date` est un libellé libre, pas une date |
| `personnages[] {nom, temps}`, `ouvrages[] {titre, role, temps}` | idem, `temps` en secondes | `role` : « texte étudié » → `texte-etudie`, « cité » → `cite` |
| `points_incertains[]`, `_controles[]` | `pointsIncertains[]`, `controles[]` | admin seulement |
| `_source.id / date / duree_min` | `telegramId`, `dateEnregistrement`, `duree` | `duree` en secondes |
| `serie_probable`, `numero_annonce` | — | remplacés par le classement de l'étape 5 |

Collections côté site : `themes-audio` (range les séries) → `series-audio` →
`seances-audio` (versions + brouillons), et `fichiers-audio` (upload dédié,
`audio/mp4`, préfixe R2 à part des images).

## 5. Automatisation quotidienne (prévue, pas encore construite)

Décidé le 2026-10-20 : un passage par jour sur le VPS, **brouillon + alerte**.
Le robot prépare la séance, le vérificateur relit et publie.

- Un conteneur à part (Python + ffmpeg) dans Dokploy, lancé chaque jour par un
  *Schedule Job* Dokploy.
- Nouveaux audios = messages dont le `telegramId` n'existe pas encore sur le site
  (lu par l'API) : pas de fichier d'état.
- L'étape 5 ne convient pas à un audio isolé (elle reclasse tout) : la remplacer
  par « voici les séries existantes, voici la nouvelle fiche → laquelle, quel
  numéro, ou nouvelle série ».
- Alerte par **bot Telegram** (`sendMessage`, lien vers la séance dans l'admin),
  envoyée au compte du **vérificateur** (la personne qui relit). Un bot ne peut
  pas écrire en premier : le vérificateur appuie une fois sur « Démarrer », on
  récupère son `chat_id` par `getUpdates`. Il lui faut aussi un compte admin.
- Session Telegram **propre au serveur** : ne pas copier celle du poste.

## 6. À adapter dans un nouveau projet

1. **Les prompts** sont écrits pour des cours de sciences islamiques en arabe et
   français (translittération, formule ﷺ, deux minutages). Garder les règles
   d'honnêteté (rien hors de l'audio, points incertains, citations) ; réécrire
   le reste pour le domaine.
2. **Le schéma de fiche** suit l'interface du site. Changer une rubrique = changer
   `SCHEMA_FICHE`, `donneesSeance()` dans l'import, et la collection.
3. **La source** : `TG_CHANNEL` et le filtre `audio/ogg`. Pour des vidéos ou des
   mp3, adapter le filtre de type MIME et le `mime_type` de l'upload Gemini.
4. **Le son** : `FILTRES` a été réglé à l'oreille sur ces enregistrements.
   Refaire un essai avant/après sur 2 audios.
5. **Le CMS** : `import-payload.ts` suppose les quatre collections ci-dessus et
   l'alias `@/payload.config`. Un autre CMS = réécrire la `Cible` (quatre
   méthodes : trouver, créer, modifier, envoyer un audio).
6. **Secrets** : `.env`, `session.session` et les audios ne vont **jamais** dans
   un dépôt. Offre gratuite Gemini : Google peut utiliser les données envoyées,
   à réserver aux contenus déjà publics.
7. **Coût** : ~0,10 $ par heure d'audio avec `gemini-3.8-flash` (tarif oct. 2026).
