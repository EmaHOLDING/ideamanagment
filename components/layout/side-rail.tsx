"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LightbulbIcon, LayoutGridIcon, KanbanSquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SideRail() {
  const pathname = usePathname();
  const isWorkspaces = pathname === "/workspaces";
  const isBoard = pathname.startsWith("/workspace/");

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-14 shrink-0 flex-col items-center gap-2 border-r bg-sidebar py-3 sm:flex">
      <div className="mb-1 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <LightbulbIcon className="size-4" />
      </div>
      {isBoard ? (
        <span
          aria-disabled
          title="Workspace'ler"
          className="flex size-9 cursor-default items-center justify-center rounded-lg text-sidebar-foreground/30"
        >
          <LayoutGridIcon className="size-4.5" />
        </span>
      ) : (
        <Link
          href="/workspaces"
          aria-label="Workspace'ler"
          title="Workspace'ler"
          className={cn(
            "flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isWorkspaces && "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
        >
          <LayoutGridIcon className="size-4.5" />
        </Link>
      )}
      <span
        aria-hidden
        title="Panolar"
        className="flex size-9 cursor-default items-center justify-center rounded-lg text-sidebar-foreground/30"
      >
        <KanbanSquareIcon className="size-4.5" />
      </span>
    </aside>
  );
}
