import { AlertCircleIcon, InboxIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ContentLoading({ rows = 2, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} role="status" aria-label="İçerik yükleniyor">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-2 rounded-lg border border-border/60 p-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
      <span className="sr-only">Yükleniyor...</span>
    </div>
  );
}

export function ContentState({ title, description, tone = "empty", onRetry, className }: {
  title: string;
  description?: string;
  tone?: "empty" | "error";
  onRetry?: () => void;
  className?: string;
}) {
  const Icon = tone === "error" ? AlertCircleIcon : InboxIcon;
  return (
    <div className={cn("flex min-w-0 flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center", tone === "error" ? "border-destructive/30 bg-destructive/5" : "bg-muted/20", className)} role={tone === "error" ? "alert" : "status"}>
      <Icon className={cn("size-5", tone === "error" ? "text-destructive" : "text-muted-foreground")} />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>}
      {onRetry && <Button type="button" variant="outline" size="xs" className="mt-1" onClick={onRetry}><RotateCcwIcon /> Tekrar Dene</Button>}
    </div>
  );
}
