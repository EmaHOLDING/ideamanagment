"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PageTourStep } from "@/lib/page-tours";

export type ResolvedTourStep = { element: HTMLElement; title: string; body: string };
type Rect = { top: number; left: number; width: number; height: number };

/** Aydınlatılan alanın elemanın etrafında bıraktığı boşluk. */
const SPOT_PADDING = 6;
/** Açıklama kartı ile aydınlatılan alan arasındaki mesafe. */
const CARD_GAP = 12;
/** Kartın ekran kenarına yaklaşabileceği en kısa mesafe. */
const VIEWPORT_MARGIN = 12;
/** Bu genişliğin altında kart elemanın yanında değil, ekranın altına ya
 * da üstüne sabitleniyor: dar ekranda süzülen bir balon ya taşar ya da
 * aydınlatılan elemanın üstünü kapatır. */
const MOBILE_BREAKPOINT = 640;

function isVisible(el: HTMLElement) {
  if (el.getClientRects().length === 0) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  return getComputedStyle(el).visibility !== "hidden";
}

/** Her adım için ekranda GÖRÜNEN ilk hedefi bulur; hiçbiri yoksa adımı
 * atlar. Rol, ekran genişliği ya da boş durum yüzünden ekranda olmayan
 * butonlar böylece kendiliğinden turdan düşüyor. Tur açılmadan, tıklama
 * anında çağrılıyor: sonuç boşsa tur hiç açılmıyor. */
export function resolvePageTourSteps(steps: PageTourStep[]): ResolvedTourStep[] {
  const resolved: ResolvedTourStep[] = [];
  for (const step of steps) {
    for (const target of step.targets) {
      const element = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-tour="${target.id}"]`)
      ).find(isVisible);
      if (element) {
        resolved.push({
          element,
          title: target.title ?? step.title,
          body: target.body ?? step.body,
        });
        break;
      }
    }
  }
  return resolved;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Ekrandaki gerçek elemanları sırayla aydınlatıp anlatan tur. Yalnızca
 * kullanıcı "Bu sayfayı tanıt" dediğinde, istemcide mount ediliyor;
 * `steps` en az bir adım içermeli (bkz. resolvePageTourSteps). */
export function PageTour({
  steps: resolved,
  onClose,
  returnFocusTo,
}: {
  steps: ResolvedTourStep[];
  onClose: () => void;
  returnFocusTo?: React.RefObject<HTMLElement | null>;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  const current = resolved[index];
  const total = resolved.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  function close() {
    onClose();
    returnFocusTo?.current?.focus();
  }

  // Adım değişince elemanı görünür alana getir ve konumunu izle. Konum,
  // kaydırma ve yeniden boyutlandırma sırasında da güncel tutuluyor:
  // pürüzsüz kaydırma sürerken aydınlatma elemanla birlikte hareket eder.
  useLayoutEffect(() => {
    if (!current) return;
    const { element } = current;

    const measure = () => {
      const r = element.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    element.scrollIntoView({
      block: "center",
      inline: "center",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });

    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    // capture: panonun yatay kaydırılan kolon alanı gibi iç kaydırma
    // kaplarındaki olaylar da yakalansın.
    window.addEventListener("scroll", measure, true);
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      observer.disconnect();
    };
  }, [current]);

  // Kartın boyutu, nereye yerleşeceğini hesaplamak için gerekiyor.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize[0];
      setCardSize({ width: box.inlineSize, height: box.blockSize });
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // Her adımda odak "İleri"de: Enter ile ilerlenebilsin. Odak, konum
  // ölçümünü BEKLEMEDEN veriliyor (ölçüm bir sonraki kareye kalıyor ve
  // arka plandaki sekmede kareler duraklayabiliyor). Bu yüzden kart,
  // konumu hazır olana kadar `invisible` değil `opacity-0`: görünmez ama
  // odaklanabilir.
  useLayoutEffect(() => {
    nextButtonRef.current?.focus({ preventScroll: true });
  }, [index]);

  function goTo(target: number) {
    setIndex(Math.min(Math.max(target, 0), total - 1));
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (!isLast) goTo(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === "Tab") {
      // Odak kartın içinde kalsın: arkadaki sayfa karartılmış ve tıklanamaz.
      const focusables = cardRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]):not([tabindex='-1'])"
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  if (!current) return null;

  const spot = rect && {
    top: rect.top - SPOT_PADDING,
    left: rect.left - SPOT_PADDING,
    width: rect.width + SPOT_PADDING * 2,
    height: rect.height + SPOT_PADDING * 2,
  };

  const cardStyle = cardPosition(spot, cardSize, viewport);

  return createPortal(
    <div className="fixed inset-0 z-[70]" onKeyDown={handleKeyDown}>
      {/* Tıklamaları yakalayan karartma: tur sürerken arkadaki sayfa
          kullanılamaz, böylece kullanıcı yanlışlıkla bir şeye basmaz.
          mousedown engelleniyor ki karartmaya tıklamak odağı karttan
          düşürmesin (yoksa ok tuşları ve Esc çalışmaz olurdu). */}
      <div className="absolute inset-0" aria-hidden onMouseDown={(e) => e.preventDefault()} />
      {spot && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-[top,left,width,height] duration-300 ease-out motion-reduce:transition-none"
          style={{ ...spot, boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.6)" }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={cn(
          "absolute w-[min(22rem,calc(100vw-1.5rem))] max-sm:w-auto rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-2xl ring-1 ring-foreground/10",
          "transition-[top,left,bottom] duration-300 ease-out motion-reduce:transition-none",
          !rect && "opacity-0"
        )}
        style={cardStyle}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Turu kapat"
          className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon className="size-4" />
        </button>

        <div key={index} className="animate-in duration-200 fade-in-0 motion-reduce:animate-none" aria-live="polite">
          <p className="text-[0.65rem] font-semibold tracking-wider text-primary uppercase">
            {index + 1} / {total}
          </p>
          <h2 id={titleId} className="mt-1.5 pr-6 text-base leading-snug font-semibold">
            {current.title}
          </h2>
          <p id={bodyId} className="mt-1.5 leading-relaxed text-muted-foreground">
            {current.body}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          {isLast ? (
            <span />
          ) : (
            <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={close}>
              Turu atla
            </Button>
          )}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={() => goTo(index - 1)}>
                <ArrowLeftIcon /> Geri
              </Button>
            )}
            <Button ref={nextButtonRef} size="sm" onClick={() => (isLast ? close() : goTo(index + 1))}>
              {isLast ? "Bitir" : <>İleri <ArrowRightIcon /></>}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Kartın yerleşimi.
 * - Dar ekranda: ekranın altına sabit; aydınlatılan eleman ekranın alt
 *   yarısındaysa üstüne (yoksa kart elemanı kapatırdı).
 * - Geniş ekranda sırayla: elemanın altı, üstü, sağı, solu. Alt/üstte
 *   yatayda elemana ortalanır; yanda dikeyde ortalanır. Hepsi ekran
 *   kenarlarına taşmayacak şekilde kırpılır. Hiçbiri sığmazsa (eleman
 *   ekranı neredeyse tamamen kaplıyorsa) kart ekranın altına biner. */
function cardPosition(
  spot: Rect | null,
  card: { width: number; height: number },
  viewport: { width: number; height: number }
): React.CSSProperties {
  if (!spot || viewport.width === 0) return { top: VIEWPORT_MARGIN, left: VIEWPORT_MARGIN };

  if (viewport.width < MOBILE_BREAKPOINT) {
    const spotCenter = spot.top + spot.height / 2;
    // Ekranın yarısından uzun bir eleman (ör. mobilde bir pano kolonu)
    // zaten her yerde kartla çakışır; o durumda kart ALTA konuyor ki
    // elemanın başlık kısmı (ör. kolonun durum rozeti) açıkta kalsın.
    const isTall = spot.height > viewport.height * 0.5;
    const inLowerHalf = !isTall && spotCenter > viewport.height * 0.55;
    return inLowerHalf
      ? { top: VIEWPORT_MARGIN, left: VIEWPORT_MARGIN, right: VIEWPORT_MARGIN }
      : { bottom: VIEWPORT_MARGIN, left: VIEWPORT_MARGIN, right: VIEWPORT_MARGIN };
  }

  const clampLeft = (value: number) =>
    Math.min(Math.max(value, VIEWPORT_MARGIN), viewport.width - card.width - VIEWPORT_MARGIN);
  const clampTop = (value: number) =>
    Math.min(Math.max(value, VIEWPORT_MARGIN), viewport.height - card.height - VIEWPORT_MARGIN);

  const horizontallyCentered = clampLeft(spot.left + spot.width / 2 - card.width / 2);
  const verticallyCentered = clampTop(spot.top + spot.height / 2 - card.height / 2);

  const below = spot.top + spot.height + CARD_GAP;
  if (below + card.height <= viewport.height - VIEWPORT_MARGIN) {
    return { top: below, left: horizontallyCentered };
  }

  const above = spot.top - CARD_GAP - card.height;
  if (above >= VIEWPORT_MARGIN) {
    return { top: above, left: horizontallyCentered };
  }

  // Uzun elemanlar (ör. bir pano kolonu) için yan taraf.
  const right = spot.left + spot.width + CARD_GAP;
  if (right + card.width <= viewport.width - VIEWPORT_MARGIN) {
    return { top: verticallyCentered, left: right };
  }

  const left = spot.left - CARD_GAP - card.width;
  if (left >= VIEWPORT_MARGIN) {
    return { top: verticallyCentered, left };
  }

  return { top: viewport.height - card.height - VIEWPORT_MARGIN, left: horizontallyCentered };
}
