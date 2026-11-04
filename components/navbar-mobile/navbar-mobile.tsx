"use client";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPOSANT « Navbar mobile »  (extrait du portfolio aadidevv, Next.js App Router)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Navigation mobile d'une **page one-page** (sections ancrées par `id`), tout
 * en bas de l'écran, dans la zone du pouce :
 * - fermée : un bouton flottant carré (≡) en bas à droite, verre dépoli ;
 * - ouverte : un panneau qui monte du bas (bottom sheet) avec le monogramme,
 *   les bascules langue/thème, un bouton fermer, et une rangée de pastilles de
 *   section qui **défile horizontalement** avec des fondus aux bords.
 *
 * Le panneau **reste ouvert** après un clic sur une section (le `setOpen(false)`
 * est commenté dans l'original) et recentre de lui-même la pastille active au
 * fil du défilement de la page : il sert alors de barre de progression.
 *
 * Ce fichier est volontairement **aplati** : dans l'original, l'état (section
 * active, scroll programmatique) vivait dans `Navbar.tsx` (hook `useNavState`
 * partagé avec les variantes tablette et desktop). Tout est regroupé ici. Voir
 * le README du dossier.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";

/* ══ Constantes ════════════════════════════════════════════════════════════ */

/** Courbe « ease-out expo » douce, commune à toutes les animations du site. */
const EASE = [0.22, 1, 0.36, 1] as const;

/* ══ Types ═════════════════════════════════════════════════════════════════ */

export type NavbarMobileProps = {
  /** IDs des `<section id>` de la page, dans l'ordre d'affichage. */
  sections: readonly string[];
  /** Libellé affiché pour chaque ID de section. */
  labels: Record<string, string>;
  /** Monogramme en tête du panneau (« A. » dans l'original). */
  brand?: string;
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
  a11y?: { openMenu: string; closeMenu: string; lightMode: string; darkMode: string };
};

const A11Y_FR = {
  openMenu: "Ouvrir le menu",
  closeMenu: "Fermer le menu",
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
      // Zone de détection = quart supérieur de l'écran.
      { rootMargin: "0px 0px -75% 0px", threshold: 0 }
    );
    document.querySelectorAll("section[id]").forEach((s) => observerRef.current?.observe(s));
    return () => observerRef.current?.disconnect();
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

/* ══ Bascules ══════════════════════════════════════════════════════════════ */

/**
 * Bascule FR/EN — un **vrai lien** vers la même page dans l'autre langue.
 * Volontairement un `<a>` et non un `<Link>` : dans l'original, le root layout
 * vit sous `app/[locale]`, changer de langue change `<html lang>` et remonte le
 * ThemeProvider — une navigation document repart d'un HTML sain.
 * Version agrandie (34 px) de la bascule tablette, cible tactile oblige.
 */
function MobileLangToggle({ lang }: { lang: NonNullable<NavbarMobileProps["lang"]> }) {
  const isFR = lang.current === "fr";

  return (
    <a
      href={lang.alternateHref}
      hrefLang={isFR ? "en" : "fr"}
      onClick={lang.onSwitch}
      aria-label={lang.ariaLabel}
      className="flex items-center justify-center cursor-pointer shrink-0"
      style={{
        background: "var(--color-bg-tertiary)",
        boxShadow: "0px 1px 3px rgba(0,0,0,0.08)",
        borderRadius: 16,
        height: 34,
        padding: "0 3px",
      }}
    >
      {(["FR", "EN"] as const).map((code) => {
        const active = (code === "FR") === isFR;
        return (
          <span
            key={code}
            className="flex items-center justify-center"
            style={{
              height: 28,
              width: 38,
              borderRadius: 13,
              fontSize: 13,
              fontWeight: 500,
              ...(active
                ? {
                    background: "var(--color-bg-primary)",
                    boxShadow: "0px 1px 4px rgba(0,0,0,0.12)",
                    color: "var(--color-text-primary)",
                  }
                : { color: "var(--color-text-muted)" }),
            }}
          >
            {code}
          </span>
        );
      })}
    </a>
  );
}

/**
 * Thème clair/sombre. Placeholder de même taille jusqu'au montage :
 * `resolvedTheme` est inconnu côté serveur (erreur d'hydratation sinon).
 */
function MobileThemeToggle({ labels }: { labels: { lightMode: string; darkMode: string } }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const box = {
    width: 34,
    height: 36,
    borderRadius: 8,
    background: "var(--color-bg-primary)",
    border: "1px solid var(--color-border)",
  } as const;

  if (!mounted) return <div style={{ ...box, flexShrink: 0 }} />;

  const isDark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? labels.lightMode : labels.darkMode}
      className="flex items-center justify-center cursor-pointer shrink-0"
      style={{ ...box, fontSize: 16, color: "var(--color-text-primary)" }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

/* ══ Composant ═════════════════════════════════════════════════════════════ */

export function NavbarMobile({
  sections,
  labels,
  brand = "A.",
  lang,
  showThemeToggle = true,
  a11y = A11Y_FR,
}: NavbarMobileProps) {
  const { activeSection, scrollTo } = useActiveSection(sections);
  const [open, setOpen] = useState(false);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  // Recentre la pastille active dans la rangée — à l'ouverture, et à chaque
  // changement de section pendant que la page défile.
  useEffect(() => {
    if (!open || !navScrollRef.current) return;
    const activeIndex = sections.indexOf(activeSection);
    if (activeIndex < 0) return;
    // Les boutons de la rangée sont exactement `sections`, dans le même ordre.
    const btns = navScrollRef.current.querySelectorAll("button");
    const btn = btns[activeIndex] as HTMLElement | undefined;
    btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [open, activeSection, sections]);

  // Fondus aux bords : visibles seulement s'il reste du contenu de ce côté
  // (seuil de 8 px pour ignorer l'arrondi du scroll).
  function updateFades() {
    const el = navScrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 8);
    setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }

  // Mesure initiale : `onScroll` ne dit rien tant que rien n'a défilé.
  // Léger délai pour laisser le panneau se monter.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(updateFades, 50);
    return () => clearTimeout(t);
  }, [open, sections]);

  function handleNav(section: string) {
    scrollTo(section);
    // setOpen(false);  ← volontairement désactivé dans l'original : le panneau reste ouvert.
  }

  return (
    <>
      {/* ── Panneau ouvert (bottom sheet) ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.38, ease: EASE }}
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
              background: "color-mix(in srgb, var(--color-bg-primary) 85%, transparent)",
              border: "1px solid rgba(147,123,123,0.35)",
              borderRadius: "20px 20px 0 0",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              padding: "20px 20px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Ligne du haut : monogramme · bascules · fermer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: 48,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  lineHeight: 1,
                }}
              >
                {brand}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {lang && <MobileLangToggle lang={lang} />}
                {showThemeToggle && <MobileThemeToggle labels={a11y} />}
              </div>

              <button
                onClick={() => setOpen(false)}
                aria-label={a11y.closeMenu}
                className="flex items-center justify-center cursor-pointer"
                style={{
                  width: 36,
                  height: 36,
                  color: "var(--color-text-primary)",
                  background: "none",
                  border: "none",
                }}
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            {/* Séparateur */}
            <div style={{ height: 1, background: "var(--color-border)" }} />

            {/* Pastilles — défilement horizontal avec fondus aux bords */}
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
              {/* Fondu gauche */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 32,
                  background:
                    "linear-gradient(to right, color-mix(in srgb, var(--color-bg-primary) 93%, transparent) 30%, color-mix(in srgb, var(--color-bg-primary) 60%, transparent) 70%, transparent)",
                  zIndex: 1,
                  pointerEvents: "none",
                  opacity: showLeftFade ? 1 : 0,
                  transition: "opacity 0.2s",
                }}
              />
              {/* Fondu droit */}
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 40,
                  background: "linear-gradient(to left, var(--color-bg-primary), transparent)",
                  zIndex: 1,
                  pointerEvents: "none",
                  opacity: showRightFade ? 1 : 0,
                  transition: "opacity 0.2s",
                  borderRadius: "0 0 0 2px",
                }}
              />
              <div
                ref={navScrollRef}
                onScroll={updateFades}
                style={{
                  display: "flex",
                  overflowX: "auto",
                  alignItems: "center",
                  flexWrap: "nowrap",
                  gap: 6,
                  padding: "8px 4px",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
                className="[&::-webkit-scrollbar]:hidden"
              >
                {sections.map((section) => {
                  const isActive = activeSection === section;
                  return (
                    <button
                      key={section}
                      onClick={() => handleNav(section)}
                      className="cursor-pointer shrink-0"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        // La pastille active grossit un peu (10/18 vs 8/14).
                        padding: isActive ? "10px 18px" : "8px 14px",
                        borderRadius: 12,
                        background: isActive ? "var(--color-accent)" : "transparent",
                        fontSize: 15,
                        fontWeight: 500,
                        color: isActive ? "#fafaf8" : "var(--color-text-muted)",
                        border: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {labels[section] ?? section}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fermé : bouton flottant seul ── */}
      <AnimatePresence>
        {!open && (
          <motion.div
            key="bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed bottom-6 right-5 z-50"
          >
            <button
              onClick={() => setOpen(true)}
              aria-label={a11y.openMenu}
              className="flex items-center justify-center cursor-pointer"
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                border: "0.5px solid rgba(200,190,180,0.5)",
                boxShadow: "0px 6px 20px rgba(0,0,0,0.25)",
                background: "color-mix(in srgb, var(--color-bg-primary) 72%, transparent)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                fontSize: 30,
                color: "var(--color-text-primary)",
                lineHeight: 1,
              }}
            >
              ≡
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
