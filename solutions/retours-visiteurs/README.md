# Retours des visiteurs : un bouton d'avis, neuf variantes

Un bouton présent sur toutes les pages pour signaler un souci, donner une idée,
un besoin ou une critique, avec captures d'écran. Le site relève tout seul ce
que le visiteur ne pense pas à dire : la page, la section à l'écran, les pages
vues avant, l'appareil, les erreurs survenues dans la page. À certains moments,
une bulle avec croix invite à s'en servir, une fois par visite au plus.

- **Origine** : `MEDINE_INSTITUT` (Next.js 16 App Router + Payload CMS + Tailwind v4),
  mis en place le 2026-11-03. Extrait de `components/sections/BoutonAvisClient.tsx`,
  `FormulaireAvis.tsx`, `LienAvis.tsx`, `lib/retours.ts`, `lib/telegram.ts`,
  `app/[lang]/(app)/actions-retour.ts`, `collections/RetoursVisiteurs.ts` et
  `CapturesRetour.ts`.
- **Maquettes** : Figma `bUpID4IrQkHEGhAzvRrnzf` (pages 01 à 07 : pistes,
  formulaire, moments, ce que l'administration reçoit, textes).
- **Fichiers** : deux, une exception assumée à la règle « un seul fichier » (une
  Server Action ne peut pas vivre dans un fichier `"use client"`) :
  - `retours-visiteurs.tsx` : **toutes les variantes**, le formulaire, les
    bulles, le relevé du contexte, le panneau. Client component, tout aplati.
  - `retours-visiteurs.server.ts` : l'envoi tel qu'il tourne chez Médine
    (Payload, captures privées, alerte Telegram) et les deux collections.

## 1. Le problème que ça résout

Un site neuf a besoin des retours de ses visiteurs, surtout des mauvais : ce qui
ne marche pas, ce qu'on ne comprend pas, ce qui manque. Mais un visiteur qui
bute sur un bug n'a ni l'envie ni les mots pour le décrire : il ne dit pas sur
quelle page il était, ni sur quel appareil. Et une fenêtre qui s'ouvre à
l'arrivée, on la ferme par réflexe.

D'où trois choix :
- **Rapide** : deux touchers suffisent, une puce (« Ça ne marche pas », « Pas
  clair », « Une idée », « Un besoin », « Je n'aime pas », « J'aime bien »)
  puis Envoyer. Le texte n'est exigé que sans puce, et l'exemple du champ change
  avec la puce.
- **Le contexte part tout seul** : c'est ce qui rend un « ça ne marche pas »
  exploitable.
- **Proposé au bon moment, jamais à l'arrivée** : après un vrai temps sur le
  site, sur une nouveauté, ou juste après une erreur dans la page.

## 2. Utilisation

```tsx
// app/layout.tsx (Server Component)
import RetoursVisiteurs from "@/components/RetoursVisiteurs";
import { envoyerRetour } from "@/app/actions-retour"; // retours-visiteurs.server.ts

<RetoursVisiteurs
  variante="pilule-menu"
  envoyer={envoyerRetour}
  whatsapp="https://wa.me/33600000000"
  nouveautes={[{ cle: "cours-gratuits", prefixe: "/cours-gratuits" }]}
  analytics={(e, d) => window.umami?.track(e, d)} // seulement depuis un Client Component
/>
```

Sur une page 404 ou `error.tsx` :

```tsx
<LienAvis texte="Vous cherchiez quelque chose ?" action="Dites-le-nous" origine="page404" />
<LienAvis texte="…" action="…" origine="pageErreur" digest={error.digest} />
```

`envoyer` est la **seule couture** entre l'interface et le stockage : n'importe
quelle fonction `(FormData) => Promise<ResultatRetour>` convient (e-mail via
Resend, ligne dans un tableur, webhook Slack). Champs reçus : `type`,
`message`, `contact`, `origine`, `contexte` (JSON `ContexteRetour`),
`captures` (0 à 3 images), `site` (champ piège : rempli = robot).

Une fonction ne passe d'un Server Component à un Client Component que si c'est
une Server Action : pour `analytics`, envelopper le composant dans un petit
Client Component.

## 3. Les neuf variantes

Une seule prop, `variante`. Toutes partagent le formulaire, les bulles, le
contexte et le panneau (ancré sur ordinateur, tiroir qui monte du bas sur
téléphone et tablette) ; seul le point d'entrée change.

| `variante` | Ce qu'on voit | Avantage | Coût |
|---|---|---|---|
| `languette` (A) | Languette sombre « Un avis ? » au bord droit, à mi-hauteur | Toujours visible, ne touche pas au coin de WhatsApp | Présente au milieu de l'écran ; mord le bord du texte sur téléphone |
| `pastille` (B) | Petite pastille ronde posée au-dessus de la bulle WhatsApp | Tout ce qui flotte dans un seul coin | Deux boutons ronds de discussion côte à côte se comprennent mal |
| `bulle-menu` (C) | Une seule bulle ; au toucher, un menu « WhatsApp » ou « Donner un avis » | Rien de plus à l'écran qu'une bulle | Fermée, elle ne dit pas ce qu'elle contient ; un toucher de plus vers WhatsApp |
| `bouton-menu` (F2) | Bouton libellé « Une question, un avis ? » avec les deux icônes, même menu | Fermé, il dit enfin ce qu'il contient | Toujours un toucher de plus vers WhatsApp ; 66 % de la largeur d'un téléphone |
| `etiquette` (F3) | La bulle WhatsApp intacte, une étiquette « Un souci, une idée ? » glissée dessous | La bulle connue ne change pas | Deux couleurs fortes côte à côte ; 61 % de la largeur |
| `pilule` (F1) | Une pilule en deux moitiés : « Un avis ? » à gauche, WhatsApp à droite | Un seul objet, WhatsApp en un toucher, les deux usages lisibles | Deux zones collées : c'est le changement de couleur qui les sépare |
| `pilule-repliable` (F4) | F1, dont le libellé se replie en icône pendant le défilement sur téléphone | Le libellé reste là au repos, sans couvrir le texte qu'on lit | Un mouvement de plus à l'écran |
| `pilule-menu` (F4 + C) | La pilule repliable, mais un seul bouton : le toucher ouvre le menu de C, la pilule devient une croix | Fermée, elle montre les deux usages ; ouverte, chacun est écrit en toutes lettres | WhatsApp passe à deux touchers |
| `bas-de-page` (D) | Rien ne flotte : une ligne « Un souci sur cette page ? » posée avant le pied de page | Zéro ajout pendant la lecture | Il faut descendre en bas : un visiteur bloqué en haut ne la voit pas |

**Médine a retenu `pilule-menu`** (le 2026-11-06, après une semaine sur `pilule-repliable`). Mise en ligne, la pilule ouvrait directement le formulaire ou WhatsApp selon la moitié touchée ; le client attendait le menu de C au toucher, et a accepté que WhatsApp passe à deux touchers. Retours sur le chemin : A
« trop chiant à l'écran, trop au milieu » ; B « très bien, mais pourquoi deux
trucs de chat ? » ; C « super, mais on ne voit pas ce que c'est quand c'est
fermé ». Il voulait un seul bouton qui montre les deux, avec un libellé lisible
**aussi sur téléphone**.

Choisir sur un autre projet :
- **un WhatsApp qui amène les inscriptions** → `pilule` ou `pilule-repliable`
  (WhatsApp reste à un toucher) ;
- **un client qui veut lire les deux choix avant de toucher** → `pilule-menu`
  (suivre les clics WhatsApp après le changement) ;
- **pas de WhatsApp** → `pilule-repliable` sans `whatsapp` (il reste « Un
  avis ? »), ou `languette` ;
- **site de lecture longue où rien ne doit flotter** → `bas-de-page`, en
  comptant sur les bulles ;
- **coin bas droit déjà occupé** (chat, lecteur) → `languette`.

Ajouter une variante : un adaptateur dans `POINTS_ENTREE` et son nom dans
`VARIANTES`. Le reste ne bouge pas.

## 4. Les moments : quand la bulle sort

`choisirBulle` est une fonction pure : c'est elle qu'on teste, sans navigateur.

| Règle | Valeur de départ |
|---|---|
| Rien au début de la visite | 20 s |
| Bulle générale | à la 3ᵉ page vue, ou après 45 s sur le site |
| **Une seule bulle par visite**, toutes sortes confondues | toujours |
| Croix sur la bulle générale | plus de bulle générale pendant 14 jours |
| Nouveauté | une fois par rubrique, après 30 s passées dessus |
| Erreur dans la page | prioritaire sur les deux autres |
| Jamais pendant une action | saisie en cours, fenêtre ou tiroir ouvert : on attend |

Le client trouvait 90 s trop long pour la bulle générale : la 3ᵉ page vue dit
mieux qu'une durée que le visiteur « a vu des choses ». Même fermée, une bulle a
servi : elle a montré où est le bouton.

Les erreurs comptées sont celles du site seulement (fichier du même domaine) :
une extension ou un script tiers qui plante n'est pas un bug du site.

## 5. Points non évidents, à ne pas casser

| Point | Pourquoi |
|---|---|
| Le menu ne rend pas le focus quand il mène au formulaire | Constaté chez Médine (menu en Popover Radix) : le focus rendu à la pilule tombe hors du panneau tout juste ouvert sur ordinateur, qui se referme aussitôt. D'où `onCloseAutoFocus` bloqué dans ce cas. Le menu de ce fichier est un simple état, sans ce retour de focus. |
| Sans WhatsApp, pas de menu | Un menu d'une seule ligne est un toucher pour rien : le bouton ouvre directement le formulaire (`/contact`, application installée). |
| `min-w-0` sur le libellé repliable | Un élément d'une rangée flexible ne descend pas sous la largeur de son texte : sans lui, `max-w-0` ne replie rien (constaté). |
| Libellé replié par `max-w-0`, pas `hidden` | Le texte reste lu par les lecteurs d'écran, et le nom du bouton ne change pas. |
| Panneau contrôlé, **sans** déclencheur | Le tiroir de vaul enveloppe son déclencheur : poser la pilule entière dedans ouvrirait le formulaire en touchant la moitié WhatsApp. On ouvre par `ouvrir()`. |
| Mise en valeur sur **un seul passage** | La première version mettait toute l'accroche en italique orange : refusée, « tout mis en valeur, plus rien ne ressort ». Texte 15 px, seul `**le passage clé**` en gras orange. |
| Adresses masquées (`masquer`) | Un lien personnel porte un code secret dans son adresse : il ne doit partir ni dans l'administration ni dans une messagerie. Adapter l'expression au projet. |
| Mémoire en `sessionStorage` + `localStorage`, accès protégés | Navigation privée ou stockage bloqué : le bouton marche, seules les bulles se répètent davantage. |
| Captures jamais publiques | Une capture peut montrer un nom ou un formulaire rempli : collection en lecture connectée, pas d'adresse R2 publique, nom de fichier tiré au hasard. |
| Type d'image lu dans les octets | Le type annoncé par le navigateur n'est qu'une déclaration. |
| Alerte Telegram dans `after()` | Le « Merci » n'attend pas Telegram, et une alerte ratée ne fait pas échouer un retour déjà enregistré. |
| Telegram en texte brut | Avec `parse_mode`, un `*` ou un `<` dans le message d'un visiteur fait rejeter toute l'alerte. Légende de photo limitée à 1 024 caractères : au-delà, message séparé. |
| Un seul composant monté | Deux instances (le bouton du site + une page d'essai) partagent la mémoire de visite : la première prend la bulle de la visite. Constaté en testant. |

## 6. À adapter dans un nouveau projet

- **Tokens de DA** utilisés (à remapper) : `bg-bg-raised`, `bg-text-primary`,
  `text-text-primary`, `text-text-muted`, `text-text-inverse`, `text-on-media`,
  `bg-accent`, `hover:bg-accent-hover`, `text-accent-foreground`,
  `bg-accent-soft`, `text-accent-warm-texte`, `bg-brand-whatsapp`,
  `border-border-subtle`, `border-border-strong`, `border-neutre-trait`,
  `bg-neutre-survol`, `bg-scrim`, `shadow-feuille-fort`, `rounded-xs/sm/md`.
- **Textes** : `TEXTES_PAR_DEFAUT` (français neutre). Chez Médine, ils vivent
  dans le dictionnaire `retours` et l'écran de remerciement ajoute « Qu'Allah
  vous en récompense » : le client voulait que le visiteur sache que son aide
  compte. `textes` remplace un bloc entier (`formulaire`, `bulles`…), pas une
  seule clé.
- **Préfixe de langue** : `sansLangue` retire `/fr`, `/en` ; sans effet sur un
  site sans langue dans l'adresse.
- **Barre fixe en bas** (lecteur audio) : publier sa hauteur dans
  `--hauteur-lecteur` sur `<html>`, le coin remonte au-dessus.
- **Serveur** : `getPayloadClient`, règles d'accès, adresse publique du site,
  limite d'envois en mémoire (un seul conteneur ; Redis au-delà).
- **Limite de taille** des Server Actions : 3 captures de 5 Mo demandent
  `serverActions.bodySizeLimit` à 16 Mo (et le proxy à l'avenant).
- **Pas encore fait chez Médine** : une capture automatique de la page (bouton
  « Capturer cette page ») a été envisagée, à tester avant de la proposer ; la
  politique de confidentialité doit mentionner le contact facultatif.
