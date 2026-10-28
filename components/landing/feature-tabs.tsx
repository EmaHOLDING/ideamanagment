"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Shot } from "./shot";
import { useInView, useReducedMotion } from "./use-landing-motion";
import styles from "./landing.module.css";

import projeLight from "@/public/landing/proje-light.webp";
import projeDark from "@/public/landing/proje-dark.webp";
import birlikteLight from "@/public/landing/birlikte-light.webp";
import birlikteDark from "@/public/landing/birlikte-dark.webp";
import genelBakisLight from "@/public/landing/genel-bakis-light.webp";
import genelBakisDark from "@/public/landing/genel-bakis-dark.webp";

const TAB_MS = 7000;

const TABS = [
  {
    label: "Projeler",
    title: "Olgunlaşan fikir projeye dönüşür",
    text: "Problem tanımı ve hedef kitle projeye taşınır; sonraki fikirler o projenin özellikleri olarak gelişir.",
    light: projeLight,
    dark: projeDark,
    alt: "Proje sayfası: açıklama, ana problem tanımı, hedef kitle ve projeye bağlı fikirlerin listesi.",
    frame: "",
  },
  {
    label: "Ekip çalışması",
    title: "Tartışma, fikrin hemen yanında",
    text: "Yorumlar fikrin içinde durur; @ ile çağrılan kişiye bildirim gider. Kimin hangi kartı düzenlediği anlık görünür.",
    light: birlikteLight,
    dark: birlikteDark,
    alt: "Fikir detayı: solda @ ile ekip arkadaşının etiketlendiği yorumlar, sağda problem tanımı, hedef kitle ve içerik.",
    // Pencere görüntüsü dikey; tam genişlikte diğer sekmelerden çok uzun
    // kalıp onların altında boşluk bırakıyordu. Bu genişlikte Genel bakış
    // görüntüsüyle aşağı yukarı aynı yükseklikte.
    frame: "mx-auto max-w-[740px]",
  },
  {
    label: "Genel bakış",
    title: "Karar bekleyen hiçbir şey kaybolmaz",
    text: "İncelemede bekleyen, sorumlusu olmayan ve bir haftadır dokunulmamış fikirler ayrı bir listede toplanır.",
    light: genelBakisLight,
    dark: genelBakisDark,
    alt: "Genel bakış: aktif, incelemedeki, atanmamış ve uzun süredir bekleyen fikir sayıları; kolon dağılımı ve dikkat gerektiren fikirler.",
    frame: "",
  },
];

/** Özellik sekmeleri: kendiliğinden sırayla döner; kullanıcı bir sekmeye
 * tıklayınca otomatik geçiş durur ve seçtiği ekranda kalır. */
export function FeatureTabs() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, 0.2);
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const playing = inView && auto && !reducedMotion;

  return (
    <div ref={ref}>
      <div role="tablist" aria-label="Özellikler" className="grid grid-cols-3 gap-2 sm:gap-6">
        {TABS.map((tab, i) => {
          const selected = i === active;
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              id={`ozellik-tab-${i}`}
              aria-selected={selected}
              aria-controls={`ozellik-panel-${i}`}
              onClick={() => {
                setAuto(false);
                setActive(i);
              }}
              className="group text-left"
            >
              <span className="relative block h-0.5 overflow-hidden rounded-full bg-border">
                {selected &&
                  (auto && !reducedMotion ? (
                    <span
                      key={active}
                      className={styles.progress}
                      style={{
                        animationDuration: `${TAB_MS}ms`,
                        animationPlayState: playing ? "running" : "paused",
                      }}
                      onAnimationEnd={() => setActive((active + 1) % TABS.length)}
                    />
                  ) : (
                    <span className="block h-full bg-primary" />
                  ))}
              </span>
              <span
                className={cn(
                  "mt-3 block text-sm font-medium transition-colors",
                  selected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                {tab.label}
              </span>
              <span
                className={cn(
                  "mt-1 hidden font-semibold transition-colors sm:block",
                  !selected && "text-muted-foreground"
                )}
              >
                {tab.title}
              </span>
              <span className="mt-1 hidden text-sm leading-relaxed text-muted-foreground sm:block">
                {tab.text}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dar ekranda açıklama sekmelerin altında tek başına. */}
      <div key={active} className={cn("mt-4 sm:hidden", styles.fadeIn)}>
        <p className="font-semibold">{TABS[active].title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{TABS[active].text}</p>
      </div>

      {/* Bütün görüntüler üst üste duruyor; geçiş yalnızca saydamlıkla.
          Böylece alan yüksekliği sekme değişirken zıplamıyor. */}
      <div className="mt-8 grid sm:mt-10">
        {TABS.map((tab, i) => {
          const selected = i === active;
          return (
            <div
              key={tab.label}
              role="tabpanel"
              id={`ozellik-panel-${i}`}
              aria-labelledby={`ozellik-tab-${i}`}
              aria-hidden={!selected}
              className={cn(
                "col-start-1 row-start-1 self-start transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
                selected ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"
              )}
            >
              <Shot
                light={tab.light}
                dark={tab.dark}
                alt={tab.alt}
                sizes="(min-width: 1200px) 1152px, 100vw"
                className={tab.frame}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
