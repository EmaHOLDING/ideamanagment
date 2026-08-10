"use client";

import { useRouter } from "next/navigation";
import { MoreVerticalIcon, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Database } from "@/lib/types/database.types";

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
  role,
}: {
  id: string;
  title: string;
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
      className="cursor-pointer overflow-hidden py-0 transition-shadow hover:shadow-md"
    >
      <div className={`h-1.5 w-full ${accentClassFor(id)}`} />
      <CardHeader className="pt-5 pb-5">
        <CardTitle className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
            {title.charAt(0).toUpperCase()}
          </span>
          <span className="truncate">{title}</span>
        </CardTitle>
        {canManageContent && (
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Workspace seçenekleri"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVerticalIcon />
                  </Button>
                }
              />
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem onClick={() => router.push(`/workspace/${id}/settings`)}>
                  <SettingsIcon /> Workspace Ayarları
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        )}
      </CardHeader>
    </Card>
  );
}
