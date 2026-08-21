"use client";

import { useRouter } from "next/navigation";
import { ArrowRightIcon, MoreVerticalIcon, SettingsIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Database } from "@/lib/types/database.types";
import { WORKSPACE_ROLE_LABELS } from "@/lib/status";

const ACCENT_CLASSES = [
  "bg-primary",
  "bg-pink-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
];

function accentClassFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return ACCENT_CLASSES[hash % ACCENT_CLASSES.length];
}

export function WorkspaceCard({
  id,
  title,
  description,
  role,
}: {
  id: string;
  title: string;
  description?: string | null;
  role: Database["public"]["Enums"]["workspace_role"];
}) {
  const router = useRouter();
  const canManageContent = role === "OWNER" || role === "ADMIN";

  function goToWorkspace() {
    router.push(`/workspace/${id}`);
  }

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={goToWorkspace}
      onKeyDown={(e) => {
        if (e.key === "Enter") goToWorkspace();
      }}
      className="group relative isolate cursor-pointer overflow-hidden bg-gradient-to-br from-card via-card to-primary/[0.035] py-0 shadow-[0_1px_0_rgb(255_255_255/0.025)_inset] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/15 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
      />
      <div className="flex min-h-40 flex-col gap-3 px-(--card-spacing) py-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5 font-heading text-base font-medium">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-sm ring-1 ring-white/10 ${accentClassFor(id)}`}>
              {title.charAt(0).toUpperCase()}
            </span>
            <span className="truncate">{title}</span>
          </div>
          {canManageContent && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0"
                    aria-label="Workspace seçenekleri"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVerticalIcon />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => router.push(`/workspace/${id}/settings`)}>
                  <SettingsIcon /> Workspace Ayarları
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">{description || "Bu çalışma alanı için henüz bir açıklama eklenmemiş."}</p>
        <div className="-mx-(--card-spacing) -mb-5 mt-auto flex items-center justify-between border-t border-border/60 bg-muted/20 px-(--card-spacing) py-3">
          <Badge variant="secondary" className="font-normal">{WORKSPACE_ROLE_LABELS[role]}</Badge>
          <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-70 transition-all group-hover:gap-1.5 group-hover:opacity-100">Panoya git <ArrowRightIcon className="size-3.5" /></span>
        </div>
      </div>
    </Card>
  );
}
