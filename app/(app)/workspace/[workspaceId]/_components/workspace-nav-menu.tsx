"use client";

import { useRouter } from "next/navigation";
import { ArchiveIcon, ChartNoAxesCombinedIcon, FolderKanbanIcon, ImageIcon, MenuIcon, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function WorkspaceNavMenu({
  workspaceId,
  canManageContent,
  className,
}: {
  workspaceId: string;
  canManageContent: boolean;
  className?: string;
}) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" aria-label="Menü" className={className}>
            <MenuIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/overview`)}>
          <ChartNoAxesCombinedIcon /> Genel Bakış
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/projects`)}>
          <FolderKanbanIcon /> Projeler
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/archive`)}>
          <ArchiveIcon /> Arşiv
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => document.getElementById("workspace-export-trigger")?.click()}>
          <ImageIcon /> Dışarı Aktar
        </DropdownMenuItem>
        {canManageContent && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/workspace/${workspaceId}/settings`)}>
              <SettingsIcon /> Ayarlar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
