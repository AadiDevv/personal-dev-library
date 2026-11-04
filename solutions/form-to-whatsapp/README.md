# form → WhatsApp

Formulaire de mise en relation qui **rédige le message à la place du visiteur**
et l'ouvre pré-rempli dans WhatsApp. Aucun backend, aucune donnée envoyée ni
stockée.

- **Origine** : `MEDINE_INSTITUT` (Next.js App Router + Payload CMS + Tailwind v4),
  route `/[lang]/contact`. Extrait de `app/[lang]/(app)/contact/page.tsx`,
  `components/sections/ContactForm.tsx` et `lib/contact.ts`.
- **Fichier** : `form-to-whatsapp.tsx` — tout est aplati dedans (icônes, `cx`,
  types, libellés, helpers de liens).

## 1. Le problème que ça résout

En V1 d'un site vitrine, il n'y a souvent ni paiement ni inscription en ligne :
le premier contact se fait par WhatsApp. Le CTA « Nous contacter » ouvre alors
WhatsApp **vide** — le visiteur ne sait pas quoi écrire, et le destinataire
reçoit « bonjour » sans contexte.

Cette solution remplace ce moment par un parcours guidé : quelques questions,
puis un message composé automatiquement et ouvert pré-rempli. Le visiteur n'a
plus qu'à appuyer sur envoyer, et le destinataire reçoit une demande qualifiée.

## 2. Comment ça marche

Le cœur tient en deux lignes :

```ts
const messagePret = construireMessage();
const lienWhatsapp = `https://wa.me/${numero}?text=${encodeURIComponent(messagePret)}`;
```

Tout le reste est de l'UX autour. Les points **non évidents**, à ne pas casser
en réadaptant :

| Point | Pourquoi |
|---|---|
| `window.open` **synchrone** dans le `onSubmit` | Toute étape asynchrone intercalée sort l'appel du geste utilisateur → le navigateur le bloque comme une pop-up. C'est aussi la raison pour laquelle le message est composé **à chaque rendu**, pas au moment de l'envoi. |
| Un seul clic pour envoyer | Il y avait un écran d'aperçu intermédiaire : supprimé, redondant — WhatsApp affiche de toute façon le texte dans son champ de saisie, relisible *et* éditable avant envoi. |
| Le récapitulatif **après** ouverture | Filet de sécurité pour trois cas : pop-up bloquée, WhatsApp Web qui réclame un QR code (desktop non connecté), visiteur qui préfère écrire plus tard. Son bouton « Rouvrir WhatsApp » est un vrai CTA accentué : dans le cas « pop-up bloquée », c'est le seul chemin restant vers la conversion. |
| `useLayoutEffect` + `scrollIntoView({ behavior: "instant" })` | Le récapitulatif remplace un formulaire très haut par une carte courte : la hauteur du document s'effondre et le navigateur recadre le défilement tout seul — **en l'animant**, si le projet pose `scroll-behavior: smooth` sur `html`. Résultat sans ce correctif : la page glisse seule vers une position arbitraire, récapitulatif hors écran. Ne pas repasser en `useEffect`. |
| Omission des lignes vides du message | Pas de « niveau : non précisé » disgracieux. ⚠️ L'omission ne vaut que pour les **non-réponses** : « conseillez-moi » est un **choix explicite**, le taire ferait perdre la demande de conseil (d'où `message.conseilNiveau`). |
| Préremplissage par URL | `?domaine=<slug>&module=<slug>`, lu via `useSearchParams`. Impose un `<Suspense>` autour du composant côté page, et c'est ce qui permet à un bouton « S'inscrire » d'une fiche produit d'arriver ici déjà positionné (`buildContactHref`). |
| Galerie horizontale, pas une grille | Ce sélecteur est une étape d'un formulaire parcouru verticalement : une grille de six cartes reste en travers du chemin à chaque aller-retour, mobile en tête. La galerie est bornée en hauteur et **se replie** une fois le choix fait, en rappelant la carte choisie (esprit « panier »). |
| Trois affordances de défilement | Carte coupée au bord (les `basis` ne tombent **jamais** juste : 62 / 38 / 31 %), fondu en `mask-image` (agit sur l'opacité des cartes → ne suppose rien du fond), flèches au pointeur fin. Mesure au montage + `ResizeObserver` obligatoires : `onScroll` seul ne dit rien tant que rien n'a défilé, et la flèche droite resterait allumée sur une galerie qui tient entière. |
| `min-w-0` sur le `<fieldset>` et sur la carte | Un `<fieldset>` a `min-width: min-content` par défaut et ignore la largeur de son parent → sans ça, c'est la page entière qui déborde horizontalement (mesuré : 3695 px pour un viewport de 390). Même famille de piège sur la carte à cause du `truncate`. |
| `relative` sur le `<label>` de carte | Le radio est `sr-only` donc `absolute` : sans bloc conteneur sur le label, il s'ancre au wrapper situé **au-dessus** du scroller et n'est plus rogné par lui → défilement horizontal parasite de tout le document. |

## 3. Câblage côté page (server component)

La page reste statique : rien de dynamique n'est lu côté serveur, le
préremplissage est géré côté client — d'où le `<Suspense>`.

```tsx
export default async function ContactPage({ params }) {
  const { lang } = await params;

  // Sources projet : catalogue CMS + visuels + numéro WhatsApp.
  const [catalogue, contact, visuels] = await Promise.all([
    getDomainesAvecCatalogue(lang),
    getReglagesContact(),
    getVisuelsModules(lang),
  ]);

  // Charge utile minimale et sérialisable pour le composant client.
  const catalogueForm: CatalogueContact = catalogue.map((d) => ({
    slug: d.slug,
    nom: d.nom,
    matieres: d.matieres.map((m) => ({
      slug: m.slug,
      nom: m.nom,
      modules: m.modules.map((mod) => ({
        slug: mod.slug,
        titre: mod.titre,
        resume: mod.accroche,
        complet: !!mod.isCompleteProgramme,
        visuel: visuels[mod.slug],
      })),
    })),
  }));

  return (
    <main>
      {/* En-tête compact : titre + intro + frise d'étapes numérotées.
          Pas de hero image : page de conversion, le formulaire doit être
          visible dès le chargement. */}
      <Suspense>
        <ContactForm
          catalogue={catalogueForm}
          whatsappNumero={contact.whatsappNumero.replace(/\D/g, "")}
        />
      </Suspense>
    </main>
  );
}
```

## 4. À adapter dans un nouveau projet

**1. Le vocabulaire métier.** Le formulaire raisonne en `domaine → matière →
module` (institut d'enseignement). Mapping générique : `domaine` = catégorie de
premier niveau (choisie en pills), `matière` = regroupement affiché en surtitre
de carte, `module` = l'item finalement choisi. Le drapeau `complet`
(« programme complet ») range simplement une carte en tête — c'est une
**donnée**, jamais un concept exposé au visiteur.

**2. Les champs.** `genre` (homme/femme) était utile ici — classes séparées à
l'institut. À supprimer par défaut ailleurs : c'est une donnée sensible sans
justification métier. `pourQui`, `format`, `niveau` sont des exemples de selects
à remplacer. Règle transverse à conserver : **toujours une porte de sortie
libre** (« Je ne sais pas / Peu importe ») — ne jamais forcer un choix. Seuls
l'intérêt et le prénom sont obligatoires : page de conversion, friction
minimale.

**3. Les libellés et le gabarit du message** — objet `LABELS_FR` en tête de
fichier. Dans le projet d'origine ils vivaient dans les dictionnaires i18n, et
l'en-tête de page + les étapes + le gabarit étaient éditables depuis le CMS
(global `PageContact`). Ici tout est inliné. La salutation et la clôture ont été
neutralisées (l'original était en formules arabes translittérées).

**4. Les tokens de DA.** Le code utilise **exclusivement des tokens sémantiques**
Tailwind v4, jamais de couleur brute — à remapper sur ceux du nouveau projet :

`bg-bg-raised` · `bg-bg-secondary` · `text-text-primary` · `text-text-muted` ·
`border-border-subtle` · `border-border-strong` · `bg-accent` /
`hover:bg-accent-hover` / `text-accent-foreground` / `bg-accent-soft` ·
`text-accent-warm` (erreurs) · `bg-scrim` (voiles sur image) · `text-on-media`
(texte posé sur image) · `shadow-feuille` / `shadow-feuille-fort` ·
`font-display`.

Si le nouveau projet n'a pas ce système, être force de proposition : proposer
les équivalents de sa DA plutôt que de retomber sur des couleurs Tailwind
brutes.

**5. Les dépendances.** `next/image` (repli possible en `<img>`),
`useSearchParams` de `next/navigation` (à remplacer hors App Router). `cx` et
les icônes sont déjà inlinés. Le placeholder `/placeholder-cours.png` doit
exister dans `public/`.

**6. Le numéro WhatsApp.** Attendu en chiffres uniquement, format international
(`33612345678`). Le nettoyage `.replace(/\D/g, "")` est fait côté page.
