"use client";

import { useRef, useState } from "react";
import { MessageSquareIcon, ThumbsUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView, useReducedMotion } from "./use-landing-motion";
import styles from "./landing.module.css";

const STEP_MS = 4600;

const STEPS = [
  {
    title: "Topla",
    text: "Fikir bir başlıkla panoya düşer. Problem, hedef kitle, etki ve efor sonradan tamamlanır.",
  },
  {
    title: "Değerlendir",
    text: "Ekip yorum yapar, oy verir, etiketler. Fikir kolonlar arasında aşama aşama ilerler.",
  },
  {
    title: "Projeye dönüştür",
    text: "Onaylanan fikir projeye dönüşür; sonraki fikirler o projenin özellikleri olarak gelişir.",
  },
];

const COLUMNS = [
  { name: "Taslak", dot: "bg-slate-400", cards: ["Haftalık özet e-postası", "Yüksek kontrast teması"] },
  { name: "İncelemede", dot: "bg-amber-400", cards: ["Notları otomatik metne çevirme"] },
  { name: "Onaylandı", dot: "bg-primary", cards: ["Portal üzerinden destek talebi"] },
];

const TITLE = "Toplantıda sesli not alma";

/** "Nasıl işliyor": solda üç adım, sağda adımı canlandıran küçük bir pano.
 * Bir fikir kartı yazılır, ekip onu değerlendirir, sonra projeye dönüşür.
 * Adımın süre çizgisi dolunca sonrakine geçilir; ekrandan çıkınca, fare
 * üzerindeyken ya da "hareketi azalt" açıkken durur. */
export function FlowDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  // Kart başa dönerken geri kaymasın: yeni bir kart olarak yeniden yazılsın.
  const [cycle, setCycle] = useState(0);
  const [hovered, setHovered] = useState(false);
  const playing = inView && !hovered && !reducedMotion;

  function goTo(next: number) {
    if (next === 0) setCycle((c) => c + 1);
    setStep(next);
  }

  return (
    <div
      ref={ref}
      className="grid items-center gap-10 lg:grid-cols-[4fr_7fr] lg:gap-14"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ol className="space-y-1">
        {STEPS.map((s, i) => {
          const active = i === step;
          return (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "relative w-full rounded-lg px-4 py-3.5 text-left transition-colors",
                  active ? "bg-muted/70" : "hover:bg-muted/40"
                )}
              >
                <span className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">0{i + 1}</span>
                  <span
                    className={cn(
                      "font-semibold transition-colors",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {s.title}
                  </span>
                </span>
                <span
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-500",
                    active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <span className="overflow-hidden">
                    <span className="block pt-1.5 pl-8 text-sm leading-relaxed text-muted-foreground">
                      {s.text}
                    </span>
                  </span>
                </span>
                {active && !reducedMotion && (
                  <span className="absolute inset-x-4 bottom-0 h-px overflow-hidden bg-border">
                    <span
                      key={`${cycle}-${step}`}
                      className={styles.progress}
                      style={{
                        animationDuration: `${STEP_MS}ms`,
                        animationPlayState: playing ? "running" : "paused",
                      }}
                      onAnimationEnd={() => goTo((step + 1) % STEPS.length)}
                    />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <Board step={step} cycle={cycle} />
    </div>
  );
}

function Board({ step, cycle }: { step: number; cycle: number }) {
  // Hareket eden kartın kolonu: 0 Taslak, 1 İncelemede, 2 Onaylandı.
  const col = step;
  return (
    <div
      className="rounded-xl border bg-card p-3 shadow-[0_1px_2px_rgb(0_0_0/0.05),0_24px_60px_-28px_rgb(0_0_0/0.3)] sm:p-4"
      aria-hidden
    >
      <div className="relative grid grid-cols-3 gap-(--gap) [--gap:0.5rem] [--pad:0.5rem] [--slot:9rem] sm:[--gap:0.75rem] sm:[--pad:0.625rem] sm:[--slot:8.5rem]">
        {COLUMNS.map((c, i) => (
          <div key={c.name} className="min-h-64 rounded-lg bg-muted/60 p-(--pad)">
            <div className="flex h-7 items-center gap-1.5 px-1 text-[10px] font-medium sm:text-xs">
              <span className={cn("size-1.5 shrink-0 rounded-full", c.dot)} />
              <span className="truncate">{c.name}</span>
              <span className="ml-auto text-muted-foreground tabular-nums">
                {c.cards.length + (i === col ? 1 : 0)}
              </span>
            </div>
            {/* Kartın yeri: kart geldiğinde açılır, gidince kapanır; diğer
                kartlar gerçek panodaki gibi aşağı/yukarı kayar. */}
            <div
              className="transition-[height] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]"
              style={{ height: i === col ? "calc(var(--slot) + 0.5rem)" : 0 }}
            />
            <div className="space-y-2">
              {c.cards.map((title) => (
                <div key={title} className="rounded-md border bg-card p-2">
                  <p className="text-[10px] leading-snug font-medium text-muted-foreground sm:text-[11px]">
                    {title}
                  </p>
                  <div className="mt-2 h-1 w-3/4 rounded-full bg-muted" />
                  <div className="mt-1 h-1 w-1/2 rounded-full bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div
          key={cycle}
          className={cn(
            "absolute h-(--slot) transition-[left] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)]",
            styles.fadeIn
          )}
          style={{
            top: "calc(var(--pad) + 1.75rem)",
            left: `calc(${col} * ((100% - 2 * var(--gap)) / 3 + var(--gap)) + var(--pad))`,
            width: "calc((100% - 2 * var(--gap)) / 3 - 2 * var(--pad))",
          }}
        >
          <div
            className={cn(
              "flex h-full flex-col rounded-md border bg-card p-2 shadow-sm transition-colors duration-500 sm:p-2.5",
              step === 2 && "border-primary/50"
            )}
          >
            {step === 2 && (
              <span
                className={cn(
                  "mb-1 flex items-center gap-1 text-[9px] font-medium text-emerald-600 sm:text-[10px] dark:text-emerald-400",
                  styles.fadeIn
                )}
                style={{ "--d": "500ms" } as React.CSSProperties}
              >
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Proje: Sesli Notlar
              </span>
            )}
            <p className="text-[11px] leading-snug font-semibold sm:text-[13px]">
              {[...TITLE].map((ch, i) => (
                <span key={i} className={styles.char} style={{ "--i": i } as React.CSSProperties}>
                  {ch}
                </span>
              ))}
            </p>
            {step >= 1 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                <Tag className="bg-primary/10 text-primary" delay={250}>
                  Mobil
                </Tag>
                <Tag
                  className="hidden bg-amber-500/15 text-amber-700 sm:inline-block dark:text-amber-300"
                  delay={350}
                >
                  Etki: Yüksek
                </Tag>
              </div>
            )}
            <div className="mt-auto flex items-center">
              <div className="flex -space-x-1">
                <Avatar className="bg-primary text-primary-foreground">AY</Avatar>
                {step >= 1 && (
                  <>
                    <Avatar className={cn("bg-amber-500 text-white", styles.pop)} delay={500}>
                      BD
                    </Avatar>
                    <Avatar className={cn("hidden bg-emerald-500 text-white sm:flex", styles.pop)} delay={650}>
                      EK
                    </Avatar>
                  </>
                )}
              </div>
              {step >= 1 && (
                <span className="ml-auto flex items-center gap-1.5 text-[9px] text-muted-foreground tabular-nums sm:gap-2 sm:text-[10px]">
                  <span className={cn("flex items-center gap-0.5", styles.pop)} style={{ "--d": "800ms" } as React.CSSProperties}>
                    <MessageSquareIcon className="size-2.5 sm:size-3" />3
                  </span>
                  <span className={cn("flex items-center gap-0.5", styles.pop)} style={{ "--d": "950ms" } as React.CSSProperties}>
                    <ThumbsUpIcon className="size-2.5 sm:size-3" />5
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tag({ children, className, delay }: { children: React.ReactNode; className?: string; delay: number }) {
  return (
    <span
      className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium sm:text-[10px]", styles.pop, className)}
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </span>
  );
}

function Avatar({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <span
      className={cn(
        "flex size-4 items-center justify-center rounded-full text-[7px] font-semibold ring-2 ring-card sm:size-5 sm:text-[8px]",
        className
      )}
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </span>
  );
}
