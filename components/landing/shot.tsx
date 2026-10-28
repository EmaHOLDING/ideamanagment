import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

/** Ürünün gerçek ekran görüntüsü; sayfa hangi temadaysa o temanın
 * görüntüsü gösteriliyor (tema next-themes ile <html>'e sınıf olarak
 * yazıldığı için `dark:` varyantları doğrudan çalışıyor). */
export function Shot({
  light,
  dark,
  alt,
  sizes,
  eager = false,
  chrome = false,
  className,
}: {
  light: StaticImageData;
  dark: StaticImageData;
  alt: string;
  sizes: string;
  eager?: boolean;
  /** Üstte tarayıcı penceresi şeridi. */
  chrome?: boolean;
  className?: string;
}) {
  const loading = eager ? "eager" : "lazy";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.05),0_24px_60px_-28px_rgb(0_0_0/0.35)]",
        className
      )}
    >
      {chrome && (
        <div className="flex h-8 items-center gap-1.5 border-b bg-muted/40 px-3" aria-hidden>
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="size-2.5 rounded-full bg-foreground/15" />
        </div>
      )}
      <Image
        src={light}
        alt={alt}
        sizes={sizes}
        loading={loading}
        fetchPriority={eager ? "high" : undefined}
        className="block h-auto w-full dark:hidden"
      />
      <Image
        src={dark}
        alt={alt}
        sizes={sizes}
        loading={loading}
        className="hidden h-auto w-full dark:block"
      />
    </div>
  );
}
