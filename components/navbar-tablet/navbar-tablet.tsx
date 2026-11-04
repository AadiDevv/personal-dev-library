"use client";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPOSANT « Navbar tablette »  (extrait du portfolio aadidevv, Next.js App Router)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Barre de navigation fixe en haut d'une **page one-page** (sections ancrées
 * par `id`), prévue pour la plage tablette (768 → 1536 px dans le projet
 * d'origine). Verre dépoli, pastilles de section avec suivi de la section
 * visible, bascule de langue, bascule de thème, un CTA à droite.
 *
 * Particularité : la barre **se range vers le haut** et une languette accent
 * centrée (chevron) reste toujours visible pour la faire redescendre. La
 * languette glisse avec la barre, collée à son bord inférieur.
 *
 * Ce fichier est volontairement **aplati** : dans l'original, l'état (section
 * active, scroll programmatique, ouvert/fermé) vivait dans `Navbar.tsx`
 * (hook `useNavState` partagé avec les variantes desktop et mobile), et les
 * bascules dans `NavControls.tsx`. Tout est regroupé ici, réduit à ce que la
 * variante tablette utilise. Voir le README du dossier.
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronUp, Home, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/* ══ Constantes ════════════════════════════════════════════════════════════ */

/** Courbe « ease-out expo » douce, commune à toutes les animations du site. */
const EASE = [0.22, 1, 0.36, 1] as const;

/** Hauteur de la barre (px). Sert aussi au spacer et à la translation. */
const BAR_H = 80;

/* ══ Types ═════════════════════════════════════════════════════════════════ */

/** Le bouton d'action à droite de la barre. */
export type NavCta = {
  label: string;
  /**
   * `#id` → scroll doux vers la section (ex. `#contact`).
   * Toute autre valeur → vrai lien (ex. un PDF de CV, ouvert dans un nouvel onglet).
   */
  href: string;
};

export type NavbarTabletProps = {
  /** IDs des `<section id>` de la page, dans l'ordre d'affichage. */
  sections: readonly string[];
  /** Libellé affiché pour chaque ID de section. */
  labels: Record<string, string>;
  /** ID de la section « accueil », atteinte par le petit bouton maison. */
  homeId?: string;
  cta?: NavCta;
  /** Bascule de langue (optionnelle) : URL équivalente dans l'autre langue. */
  lang?: {
    current: "fr" | "en";
    alternateHref: string;
    ariaLabel: string;
    /** Optionnel : mémoriser le choix (cookie, etc.) au clic. */
    onSwitch?: () => void;
  };
  /** false pour masquer la bascule de thème (site verrouillé sur un thème). */
  showThemeToggle?: boolean;
  a11y?: { hideNav: string; showNav: string; lightMode: string; darkMode: string };
};

const A11Y_FR = {
  hideNav: "Masquer la navigation",
  showNav: "Afficher la navigation",
  lightMode: "Passer en thème clair",
  darkMode: "Passer en thème sombre",
};

/* ══ État : section active + scroll programmatique ═════════════════════════
 *
 * Extrait de `useNavState` (Navbar.tsx). La section active est pilotée par un
 * IntersectionObserver ; pendant un scroll déclenché par un clic, l'observer
 * est ignoré pour que la pastille cliquée ne « saute » pas par les sections
 * traversées.
 */

function useActiveSection(watchKey: unknown) {
  const [activeSection, setActiveSection] = useState("");
  const observerRef = useRef<IntersectionObserver | null>(null);
  /** true pendant un scroll programmatique — l'observer est alors ignoré. */
  const scrollingRef = useRef(false);
  /** Repli si l'événement `scrollend` n'existe pas (Safari < 18…). */
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (scrollingRef.current) return;
        const entering = entries.filter((e) => e.isIntersecting);
        if (entering.length === 0) return;
        entering.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setActiveSection(entering[0].target.id);
      },
      // Zone de détection = quart supérieur de l'écran : une section devient
      // active quand son haut y entre, pas quand elle est à moitié lue.
      { rootMargin: "0px 0px -75% 0px", threshold: 0 }
    );
    document.querySelectorAll("section[id]").forEach((s) => observerRef.current?.observe(s));
    return () => observerRef.current?.disconnect();
    // Reconstruit l'observer quand la liste des sections change (dans
    // l'original : quand l'audience recruteur/client change).
  }, [watchKey]);

  function scrollTo(id: string) {
    setActiveSection(id);
    scrollingRef.current = true;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

    const unlock = () => {
      scrollingRef.current = false;
    };
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    if ("onscrollend" in window) {
      window.addEventListener("scrollend", unlock, { once: true });
    } else {
      scrollTimerRef.current = setTimeout(unlock, 1000);
    }
  }

  return { activeSection, scrollTo };
}

/* ══ Bascules (NavControls.tsx) ════════════════════════════════════════════ */

/**
 * Thème clair/sombre, 30×30. Placeholder jusqu'au montage : `resolvedTheme`
 * est inconnu côté serveur, rendre l'icône tout de suite provoquerait une
 * erreur d'hydratation.
 */
function NavThemeToggle({ labels }: { labels: { lightMode: string; darkMode: string } }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-[30px] h-[30px] rounded-[2px] bg-bg-primary" />;

  const isDark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? labels.lightMode : labels.darkMode}
      className="w-[30px] h-[30px] flex items-center justify-center rounded-[2px] bg-bg-primary cursor-pointer"
      style={{ boxShadow: "0px 2px 8.8px 1px rgba(0,0,0,0.25)" }}
    >
      {isDark ? <Sun size={16} className="text-text-primary" /> : <Moon size={16} className="text-text-primary" />}
    </button>
  );
}

/**
 * Bascule FR/EN en segmented control. C'est un **vrai lien** vers la même page
 * dans l'autre langue (crawlable, partageable). Volontairement un `<a>` et non
 * un `<Link>` : dans l'original, le root layout vit sous `app/[locale]`, donc
 * changer de langue change `<html lang>` et remonte le ThemeProvider — une
 * navigation document repart d'un HTML sain.
 */
function NavLangToggle({ lang }: { lang: NonNullable<NavbarTabletProps["lang"]> }) {
  const isFR = lang.current === "fr";
  const pill = (active: boolean) =>
    active
      ? { background: "var(--color-bg-primary)", boxShadow: "0px 1px 4px 0px rgba(0,0,0,0.12)", color: "var(--color-text-primary)" }
      : { color: "var(--color-text-muted)" };

  return (
    <a
      href={lang.alternateHref}
      hrefLang={isFR ? "en" : "fr"}
      onClick={lang.onSwitch}
      aria-label={lang.ariaLabel}
      className="flex items-center justify-center p-[2px] rounded-[15px] h-[30px] cursor-pointer"
      style={{ background: "var(--color-bg-tertiary)", boxShadow: "0px 1px 3px 0px rgba(0,0,0,0.08)" }}
    >
      <span
        className="flex items-center justify-center h-[26px] w-[36px] rounded-[13px] text-[12px] font-medium tracking-[0.3px]"
        style={pill(isFR)}
      >
        FR
      </span>
      <span
        className="flex items-center justify-center h-[26px] w-[36px] rounded-[13px] text-[12px] font-medium tracking-[0.3px]"
        style={pill(!isFR)}
      >
        EN
      </span>
    </a>
  );
}

/* ══ Composant ═════════════════════════════════════════════════════════════ */

export function NavbarTablet({
  sections,
  labels,
  homeId = "hero",
  cta,
  lang,
  showThemeToggle = true,
  a11y = A11Y_FR,
}: NavbarTabletProps) {
  const { activeSection, scrollTo } = useActiveSection(sections);
  // Dans l'original, remonté dans Navbar.tsx (ouvert par défaut, non persisté).
  const [open, setOpen] = useState(true);

  const ctaIsAnchor = cta?.href.startsWith("#");

  return (
    <>
      {/* Spacer — pousse le contenu de la page sous la top bar fixe.
          Il reste en place quand la barre est rangée : le contenu ne saute pas. */}
      <div style={{ height: BAR_H }} />

      {/* Barre fixe — rangée par translation, jamais démontée */}
      <motion.header
        initial={false}
        animate={{ y: open ? 0 : -BAR_H }}
        transition={{ duration: 0.4, ease: EASE }}
        className="fixed top-0 left-0 right-0 z-40"
        style={{ height: BAR_H }}
      >
        {/* Fond verre dépoli */}
        <div
          className="absolute inset-0"
          style={{
            background: "color-mix(in srgb, var(--color-bg-primary) 55%, transparent)",
            backdropFilter: "blur(10px) saturate(180%)",
            WebkitBackdropFilter: "blur(10px) saturate(180%)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        />

        <div className="relative h-full flex items-center justify-between px-6 gap-4">
          <nav className="flex items-center gap-2">
            {/* Bouton accueil — petit cercle discret, à l'écart des pastilles */}
            <button
              onClick={() => scrollTo(homeId)}
              className="flex items-center justify-center cursor-pointer transition-all duration-200"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background:
                  activeSection === homeId
                    ? "var(--color-accent)"
                    : "color-mix(in srgb, var(--color-bg-primary) 18%, transparent)",
                backdropFilter: activeSection === homeId ? "none" : "blur(12px) saturate(160%)",
                WebkitBackdropFilter: activeSection === homeId ? "none" : "blur(12px) saturate(160%)",
                boxShadow:
                  activeSection === homeId
                    ? "0px 2px 14px 2px rgba(0,0,0,0.18)"
                    : "0px 1px 4px 0px rgba(0,0,0,0.10), inset 0 0 0 0.5px rgba(255,255,255,0.5)",
                color: activeSection === homeId ? "#fafaf8" : "var(--color-text-muted)",
                marginRight: 10,
              }}
            >
              <Home size={13} />
            </button>

            {sections.map((section) => {
              const isActive = activeSection === section;
              return (
                <button
                  key={section}
                  onClick={() => scrollTo(section)}
                  className="flex items-center justify-center cursor-pointer transition-all duration-200"
                  style={{
                    height: 38,
                    paddingLeft: 14,
                    paddingRight: 14,
                    borderRadius: 13,
                    // Active : pastille accent pleine ; inactive : texte seul.
                    background: isActive ? "var(--color-accent)" : "transparent",
                    boxShadow: isActive ? "0px 2px 14px 2px rgba(0,0,0,0.18)" : "none",
                    fontSize: 14,
                    fontWeight: 500,
                    color: isActive ? "#fafaf8" : "var(--color-text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {labels[section] ?? section}
                </button>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* Contrôles à droite */}
          <div className="flex items-center gap-4 shrink-0">
            {lang && <NavLangToggle lang={lang} />}
            {showThemeToggle && <NavThemeToggle labels={a11y} />}
            {cta &&
              (ctaIsAnchor ? (
                <a
                  href={cta.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(cta.href.slice(1));
                  }}
                  className="btn-titanium flex items-center px-3 h-8 text-xs font-semibold rounded-full ml-1"
                >
                  {cta.label}
                </a>
              ) : (
                <a
                  href={cta.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-titanium flex items-center px-3 h-8 text-xs font-semibold rounded-full ml-1"
                >
                  {cta.label}
                </a>
              ))}
          </div>
        </div>
      </motion.header>

      {/* Languette — toujours visible, centrée, glisse avec la barre
          (y = BAR_H quand ouverte : collée sous la barre ; y = 0 quand rangée :
          seule au bord haut de l'écran). */}
      <motion.div
        initial={false}
        animate={{ y: open ? BAR_H : 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="fixed top-0 left-1/2 -translate-x-1/2 z-50"
      >
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? a11y.hideNav : a11y.showNav}
          className="flex items-center justify-center cursor-pointer"
          style={{
            width: 52,
            height: 18,
            borderRadius: "0 0 10px 10px",
            background: "var(--color-accent)",
            boxShadow: "0px 2px 4px 0px rgba(0,0,0,0.25)",
          }}
        >
          <motion.span
            animate={{ rotate: open ? 0 : 180 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <ChevronUp size={13} className="text-white" />
          </motion.span>
        </button>
      </motion.div>
    </>
  );
}

/* ══ Classe CSS globale requise : .btn-titanium ════════════════════════════
 *
 * Le CTA utilise une classe définie dans globals.css (pas un utilitaire
 * Tailwind). Bouton « métal brossé » avec un reflet qui balaie au survol et une
 * bordure dégradée. À recopier, ou à remplacer par le bouton du nouveau projet :
 *
 * .btn-titanium {
 *   background:
 *     linear-gradient(110deg, #26282b 0%, #3f4348 35%, #666d75 46%, #f7f9fb 49%,
 *       #ffffff 50%, #d4d9dd 51%, #666d75 54%, #3f4348 65%, #26282b 100%) padding-box,
 *     linear-gradient(to bottom, #c97eb8, #8b5cf6, #3b82f6, #1a3a6a) border-box;
 *   background-position: left;
 *   background-size: 250% 100%;
 *   border: 1.5px solid transparent;
 *   color: #f0f2f5;
 *   transition: box-shadow 0.3s ease, opacity 0.2s ease, background-position 0.5s ease;
 * }
 * .btn-titanium:hover {
 *   box-shadow: 0 0 5px 0 rgba(255, 0, 0, 0.75), 0 0 12px 8px rgba(139, 92, 246, 0.65),
 *     0 0 26px 8px rgba(4, 59, 236, 0.45);
 *   background-position: right;
 * }
 */
