"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombinedIcon, LayoutGridIcon, KanbanSquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const workspaceId = segments[0] === "workspace" ? segments[1] : null;
  const isWorkspaces = pathname === "/workspaces";
  const isBoard = workspaceId !== null && segments.length === 2;
  const isOverview = workspaceId !== null && segments[2] === "overview";

  const itemClass =
    "flex min-w-20 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 text-[0.7rem] font-medium transition-colors";

  return (
    <nav
      aria-label="Mobil ana navigasyon"
      className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-stretch gap-1 border-t bg-background/95 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
    >
      <Link
        href="/workspaces"
        aria-current={isWorkspaces ? "page" : undefined}
        className={cn(
          itemClass,
          isWorkspaces ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <LayoutGridIcon className="size-4.5" />
        Alanlar
      </Link>
      {workspaceId && (
        <>
          <Link
            href={`/workspace/${workspaceId}`}
            aria-current={isBoard ? "page" : undefined}
            className={cn(
              itemClass,
              isBoard ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <KanbanSquareIcon className="size-4.5" />
            Pano
          </Link>
          <Link
            href={`/workspace/${workspaceId}/overview`}
            aria-current={isOverview ? "page" : undefined}
            className={cn(
              itemClass,
              isOverview ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ChartNoAxesCombinedIcon className="size-4.5" />
            Genel Bakış
          </Link>
        </>
      )}
    </nav>
  );
}
