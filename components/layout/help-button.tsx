"use client";

import { useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CircleHelpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { completeProductTour } from "@/app/actions/userSettingsActions";
import { PRODUCT_TOUR_VERSION, TOUR_STEPS } from "@/lib/tour-steps";
import { cn } from "@/lib/utils";
import { TourIllustrationScene } from "./product-tour-illustrations";

/** Başlık çubuğundaki "?" butonu ve açtığı uygulama turu.
 *
 * `autoOpen`, kullanıcı güncel tur sürümünü henüz tamamlamadıysa true
 * gelir (bkz. app/(app)/layout.tsx): tur ilk girişte kendiliğinden açılır.
 * Kapatıldığı anda — sonuna kadar gidilmiş ya da atlanmış olsun — tur
 * tamamlandı sayılır; aksi halde kullanıcı her sayfa yüklemesinde turla
 * karşılaşırdı. Sonrasında tur yalnızca bu butondan açılır. */
export function HelpButton({ autoOpen }: { autoOpen: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const completedRef = useRef(!autoOpen);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const total = TOUR_STEPS.length;
  const current = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === total - 1;

  function goTo(target: number) {
    const clamped = Math.min(Math.max(target, 0), total - 1);
    if (clamped === step) return;
    setDirection(clamped > step ? 1 : -1);
    setStep(clamped);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setStep(0);
      setDirection(1);
      return;
    }
    if (!completedRef.current) {
      completedRef.current = true;
      // Kaydedilemezse kullanıcıya gösterilecek bir şey yok: en kötü
      // ihtimalle tur bir sonraki girişte bir kez daha açılır. Bir sonraki
      // kapatışta yeniden denensin diye bayrak geri alınıyor.
      completeProductTour(PRODUCT_TOUR_VERSION).catch(() => {
        completedRef.current = false;
      });
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(step + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(step - 1);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            aria-label="Uygulama turunu aç"
            title="Uygulama turu"
          />
        }
      >
        <CircleHelpIcon />
      </DialogTrigger>

      <DialogContent
        className="gap-0 overflow-x-hidden p-0 sm:max-w-md"
        initialFocus={nextButtonRef}
        onKeyDown={handleKeyDown}
      >
        <div
          key={step}
          className={cn(
            "animate-in duration-300 fade-in-0 motion-reduce:animate-none",
            direction === 1 ? "slide-in-from-right-6" : "slide-in-from-left-6"
          )}
        >
          <TourIllustrationScene name={current.illustration} />
          <div className="space-y-2 px-5 pt-5" aria-live="polite">
            <p className="text-[0.65rem] font-semibold tracking-wider text-primary uppercase">
              Adım {step + 1} / {total}
            </p>
            <DialogTitle className="text-lg leading-snug font-semibold">{current.title}</DialogTitle>
            {/* En uzun metne göre yer ayrılıyor (mobilde 5, masaüstünde 3
                satır): aksi halde pencere adımdan adıma uzayıp kısalıyor ve
                ortalandığı için butonlar parmağın altından kayıyor. */}
            <DialogDescription className="min-h-[calc(1.625em*5)] leading-relaxed sm:min-h-[calc(1.625em*3)]">
              {current.body}
            </DialogDescription>
          </div>
        </div>

        <div className="flex justify-center gap-1.5 px-5 pt-4 pb-4" role="group" aria-label="Tur adımları">
          {TOUR_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${i + 1}. adıma git: ${s.title}`}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === step ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-4 py-3">
          {isLast ? (
            <span />
          ) : (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => handleOpenChange(false)}>
              Turu atla
            </Button>
          )}
          <div className="flex items-center gap-2">
            {/* İlk adımda gizli ama yer kaplıyor: "İleri" butonu adımlar
                arasında yerinden zıplamasın. */}
            <Button
              variant="outline"
              className={cn(isFirst && "invisible")}
              disabled={isFirst}
              onClick={() => goTo(step - 1)}
            >
              <ArrowLeftIcon /> Geri
            </Button>
            <Button ref={nextButtonRef} onClick={() => (isLast ? handleOpenChange(false) : goTo(step + 1))}>
              {isLast ? "Başla" : <>İleri <ArrowRightIcon /></>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
