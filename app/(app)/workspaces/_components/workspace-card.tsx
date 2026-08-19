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
      className="group cursor-pointer overflow-hidden py-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className={`h-1.5 w-full ${accentClassFor(id)}`} />
      <div className="flex min-h-40 flex-col gap-3 px-(--card-spacing) py-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5 font-heading text-base font-medium">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/10">
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
        <div className="mt-auto flex items-center justify-between border-t pt-3">
          <Badge variant="secondary" className="font-normal">{WORKSPACE_ROLE_LABELS[role]}</Badge>
          <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-70 transition-all group-hover:gap-1.5 group-hover:opacity-100">Panoya git <ArrowRightIcon className="size-3.5" /></span>
        </div>
      </div>
    </Card>
  );
}
