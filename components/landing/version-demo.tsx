"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useInView, useReducedMotion } from "./use-landing-motion";
import styles from "./landing.module.css";

type Field = "title" | "problem" | "audience" | "impact";

const FIELD_LABELS: Record<Field, string> = {
  title: "Başlık",
  problem: "Problem",
  audience: "Hedef kitle",
  impact: "Etki",
};

const VERSIONS: {
  author: string;
  initials: string;
  color: string;
  date: string;
  changed: Field[];
  values: Record<Field, string>;
}[] = [
  {
    author: "Elif Kaya",
    initials: "EK",
    color: "bg-emerald-500",
    date: "12 Eki",
    changed: [],
    values: {
      title: "Sesli not",
      problem: "Toplantıda not almak zor.",
      audience: "—",
      impact: "Orta",
    },
  },
  {
    author: "Burak Demir",
    initials: "BD",
    color: "bg-amber-500",
    date: "17 Eki",
    changed: ["title", "problem", "audience"],
    values: {
      title: "Toplantıda sesli not alma",
      problem: "Not tutan kişi tartışmaya katılamıyor.",
      audience: "Saha ve satış ekipleri",
      impact: "Orta",
    },
  },
  {
    author: "Elif Kaya",
    initials: "EK",
    color: "bg-emerald-500",
    date: "24 Eki",
    changed: ["problem", "impact"],
    values: {
      title: "Toplantıda sesli not alma",
      problem: "Not tutan kişi tartışmaya katılamıyor; kararlar kayda geçmiyor.",
      audience: "Saha ve satış ekipleri",
      impact: "Yüksek",
    },
  },
];

const FIELDS: Field[] = ["title", "problem", "audience", "impact"];

/** Aynı fikrin üç versiyonu arasında gezinen kart. Her versiyonda değişen
 * alanlar işaretlenir; böylece "kim neyi değiştirdi" tek bakışta görünür. */
export function VersionDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const playing = inView && !hovered && !reducedMotion;

  useEffect(() => {
    if (!playing) return;
    // Güncel versiyonda biraz daha uzun kalsın.
    const delay = index === VERSIONS.length - 1 ? 5200 : 3400;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % VERSIONS.length), delay);
    return () => window.clearTimeout(timer);
  }, [playing, index]);

  const version = VERSIONS[index];
  const latest = index === VERSIONS.length - 1;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.05),0_24px_60px_-28px_rgb(0_0_0/0.3)]"
    >
      <div className="border-b px-4 pt-4 pb-5 sm:px-6">
        <p className="text-xs font-medium text-muted-foreground">Versiyon geçmişi</p>
        {/* Zaman çizelgesi: dolan çizgi seçili versiyona kadar uzanır. */}
        <div className="relative mt-4">
          <div className="absolute inset-x-[16.66%] top-4 h-px bg-border">
            <div
              className="h-full origin-left bg-primary transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]"
              style={{ transform: `scaleX(${index / (VERSIONS.length - 1)})` }}
            />
          </div>
          <ol className="relative grid grid-cols-3">
            {VERSIONS.map((v, i) => (
              <li key={i} className="flex flex-col items-center text-center">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`v${i + 1}: ${v.author}, ${v.date}`}
                  aria-current={i === index ? "true" : undefined}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border bg-card font-mono text-xs font-medium transition-all duration-500",
                    i === index
                      ? "scale-110 border-primary bg-primary text-primary-foreground"
                      : i < index
                        ? "border-primary/50 text-primary"
                        : "text-muted-foreground hover:border-foreground/30"
                  )}
                >
                  v{i + 1}
                </button>
                <span className="mt-2 text-[11px] leading-tight sm:text-xs">
                  <span className={cn("block font-medium", i !== index && "text-muted-foreground")}>
                    {v.author}
                  </span>
                  <span className="text-muted-foreground">{v.date}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[8px] font-semibold text-white",
                version.color
              )}
            >
              {version.initials}
            </span>
            <span key={index} className={styles.fadeIn}>
              <span className="font-medium">{version.author}</span>{" "}
              <span className="text-muted-foreground">
                {version.changed.length === 0
                  ? "fikri oluşturdu"
                  : `${version.changed.map((f) => FIELD_LABELS[f]).join(", ")} ${version.changed.length > 1 ? "alanlarını" : "alanını"} güncelledi`}
              </span>
            </span>
          </span>
          {latest && (
            <span className={cn("ml-auto rounded-full border px-2 py-0.5 text-[11px]", styles.fadeIn)}>
              Güncel
            </span>
          )}
        </div>

        <dl className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {FIELDS.map((field) => {
            const changed = version.changed.includes(field);
            return (
              <div
                key={field}
                className={cn(
                  "rounded-lg border px-3 py-2.5 transition-colors duration-500",
                  (field === "title" || field === "problem") && "sm:col-span-2",
                  changed ? "border-primary/40 bg-primary/[0.06]" : "bg-muted/30"
                )}
              >
                <dt className="flex items-center justify-between text-[11px] text-muted-foreground">
                  {FIELD_LABELS[field]}
                  {changed && (
                    <span key={index} className={cn("font-medium text-primary", styles.pop)}>
                      değişti
                    </span>
                  )}
                </dt>
                <dd
                  // Yalnızca değişen alan yeniden belirir; değişmeyen yerinde durur.
                  key={changed ? `${index}-${field}` : field}
                  className={cn("mt-1 text-sm leading-snug", changed && styles.fadeIn)}
                >
                  {version.values[field]}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}
