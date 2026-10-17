"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon, CircleHelpIcon, CompassIcon, MousePointerClickIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { completeProductTour, markPageTourHintSeen } from "@/app/actions/userSettingsActions";
import { PRODUCT_TOUR_VERSION, TOUR_STEPS } from "@/lib/tour-steps";
import { PAGE_TOURS, pageTourIdForPath, type PageTourId } from "@/lib/page-tours";
import { cn } from "@/lib/utils";
import { TourIllustrationScene } from "./product-tour-illustrations";
import { PageTour, resolvePageTourSteps, type ResolvedTourStep } from "./page-tour";

/** Turu olan bir sayfaya ilk girildiğinde "?" butonunun parlama süresi. */
const HINT_DURATION_MS = 4500;

/** Başlık çubuğundaki "?" butonu: iki turun giriş noktası.
 *
 * - Genel tur: uygulamanın özelliklerini kartlarla anlatır. `autoOpen`,
 *   kullanıcı güncel tur sürümünü henüz tamamlamadıysa true gelir (bkz.
 *   app/(app)/layout.tsx); tur ilk girişte kendiliğinden açılır.
 * - Sayfa turu: o sayfadaki gerçek butonları sırayla aydınlatır. Yalnızca
 *   turu olan sayfalarda (lib/page-tours.ts) vardır ve kendiliğinden
 *   açılmaz; bunun yerine o sayfaya ilk girildiğinde "?" birkaç saniye
 *   parlar.
 *
 * Turu olan sayfada "?" iki seçenekli bir menü açar; olmayan sayfada
 * doğrudan genel turu başlatır. */
export function HelpButton({
  autoOpen,
  seenPageTourHints,
}: {
  autoOpen: boolean;
  seenPageTourHints: string[];
}) {
  const pathname = usePathname();
  const pageTourId = pageTourIdForPath(pathname);
  const pageTour = pageTourId ? PAGE_TOURS[pageTourId] : null;
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [generalOpen, setGeneralOpen] = useState(autoOpen);
  const [activePageTour, setActivePageTour] = useState<ResolvedTourStep[] | null>(null);
  const [hintedPages, setHintedPages] = useState(() => new Set(seenPageTourHints));
  const generalCompletedRef = useRef(!autoOpen);

  // Genel tur açıkken (ör. ilk girişte) parlama yok: ekranda zaten bir tur
  // var. Genel tur kapanınca parlama başlar — son kartta "turu ? simgesinden
  // açabilirsin" yazdığı için doğal bir devam oluyor.
  const shouldHint =
    pageTourId !== null && !hintedPages.has(pageTourId) && !generalOpen && activePageTour === null;

  useEffect(() => {
    if (!shouldHint || !pageTourId) return;
    const timer = window.setTimeout(() => {
      setHintedPages((prev) => new Set(prev).add(pageTourId));
      // Kaydedilemezse en kötü ihtimalle bir sonraki ziyarette bir kez daha
      // parlar; kullanıcıya gösterilecek bir hata değil.
      markPageTourHintSeen(pageTourId).catch(() => {});
    }, HINT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [shouldHint, pageTourId]);

  /** Sayfa turu açıldıysa ipucunun işi bitmiştir; parlamaya devam etmesin. */
  function rememberHint(id: PageTourId) {
    if (hintedPages.has(id)) return;
    setHintedPages((prev) => new Set(prev).add(id));
    markPageTourHintSeen(id).catch(() => {});
  }

  // Menüden bir tur seçildiğinde odak için iki şey yarışıyordu:
  //  1. Modal menü, kapanma animasyonu bitene kadar odağı kendi içinde
  //     tutuyor; tur o sırada odak alırsa geri çekiyor.
  //  2. Menü kapanınca odağı "?" butonuna iade ediyor; bu, turun
  //     odağından SONRA olabiliyor.
  // Çözüm: menü modal değil (zaten iki öğeli küçük bir menü, sayfayı
  // kilitlemesine gerek yok) ve bir tur başlatıldıysa odağı iade etmiyor.
  // Turu "kapanış animasyonu bitince" başlatmak da denendi ama animasyon
  // olayları arka plandaki sekmede duraklayabildiği için güvenilmez.
  // Normal kapanışta (ör. Esc) odak eskisi gibi "?" butonuna döner.
  const tourStartingRef = useRef(false);

  function menuFinalFocus() {
    const starting = tourStartingRef.current;
    tourStartingRef.current = false;
    return !starting;
  }

  function startPageTour() {
    if (!pageTourId) return;
    rememberHint(pageTourId);
    const steps = resolvePageTourSteps(PAGE_TOURS[pageTourId].steps);
    if (steps.length === 0) return;
    tourStartingRef.current = true;
    setActivePageTour(steps);
  }

  function startGeneralTour() {
    // Menü yalnızca turu olan sayfada var; menüsüz sayfada bu bayrağı
    // tüketecek kimse olmadığı için set edilmiyor.
    if (pageTour) tourStartingRef.current = true;
    setGeneralOpen(true);
  }

  function handleGeneralOpenChange(next: boolean) {
    setGeneralOpen(next);
    if (next || generalCompletedRef.current) return;
    generalCompletedRef.current = true;
    // Kaydedilemezse en kötü ihtimalle tur bir sonraki girişte bir kez daha
    // açılır. Bir sonraki kapatışta yeniden denensin diye bayrak geri alınıyor.
    completeProductTour(PRODUCT_TOUR_VERSION).catch(() => {
      generalCompletedRef.current = false;
    });
  }

  const triggerButton = (
    <Button
      ref={buttonRef}
      variant="outline"
      size="icon"
      className="relative rounded-full"
      aria-label={pageTour ? "Yardım ve turlar" : "Uygulama turunu aç"}
      title={pageTour ? "Yardım ve turlar" : "Uygulama turu"}
      data-tour="help-button"
      onClick={pageTour ? undefined : startGeneralTour}
    >
      <CircleHelpIcon />
      {shouldHint && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-full ring-2 ring-primary motion-safe:animate-ping"
        />
      )}
    </Button>
  );

  return (
    <>
      {pageTour ? (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger render={triggerButton} />
          <DropdownMenuContent align="end" className="w-60" finalFocus={menuFinalFocus}>
            <DropdownMenuItem className="gap-2.5 px-2.5 py-2" onClick={startPageTour}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <MousePointerClickIcon />
              </span>
              <span className="flex flex-col">
                <span>Bu sayfayı tanıt</span>
                <span className="text-[0.7rem] text-muted-foreground">{pageTour.label}, adım adım</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2.5 px-2.5 py-2" onClick={startGeneralTour}>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <CompassIcon />
              </span>
              <span className="flex flex-col">
                <span>Uygulama turu</span>
                <span className="text-[0.7rem] text-muted-foreground">Tüm özelliklere genel bakış</span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        triggerButton
      )}

      <ProductTourDialog open={generalOpen} onOpenChange={handleGeneralOpenChange} returnFocusRef={buttonRef} />

      {activePageTour && (
        <PageTour
          steps={activePageTour}
          onClose={() => setActivePageTour(null)}
          returnFocusTo={buttonRef}
        />
      )}
    </>
  );
}

/** Genel tur: uygulamanın özelliklerini kartlarla anlatan pencere. */
function ProductTourDialog({
  open,
  onOpenChange,
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
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
    // Her açılış ilk adımdan başlasın.
    if (next) {
      setStep(0);
      setDirection(1);
    }
    onOpenChange(next);
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
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={(isOpen) => {
        // Pencere kapandıktan sonra bir sonraki açılış ilk adımdan başlasın.
        if (!isOpen) {
          setStep(0);
          setDirection(1);
        }
      }}
    >
      <DialogContent
        className="gap-0 overflow-x-hidden p-0 sm:max-w-md"
        initialFocus={nextButtonRef}
        finalFocus={returnFocusRef}
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
