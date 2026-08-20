"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SettingsIcon, LogOutIcon, LoaderCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut } from "@/app/auth/actions";
import { getInitials } from "@/lib/user-display";
import { SettingsDialog } from "./settings-dialog";
import type { NotificationEventType } from "@/lib/notification-registry";

export function UserMenu({
  displayName,
  email,
  initialNotificationPreferences,
}: {
  displayName: string;
  email: string;
  initialNotificationPreferences: Record<NotificationEventType, boolean>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settingsOpen, setSettingsOpen] = useState(false);

  function onSignOut() {
    startTransition(async () => {
      try {
        await signOut();
        router.push("/login");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Çıkış yapılamadı");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="rounded-full ring-1 ring-border hover:ring-primary/30" aria-label="Profil menüsünü aç">
              <Avatar className="size-8">
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
              </Avatar>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-72 p-1.5">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
              <Avatar size="lg" className="ring-2 ring-background">
                <AvatarFallback className="bg-primary/10 font-semibold text-primary">{getInitials(displayName)}</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2.5 px-2.5 py-2" onClick={() => setSettingsOpen(true)}>
            <span className="flex size-7 items-center justify-center rounded-md bg-muted"><SettingsIcon /></span>
            <span className="flex flex-col"><span>Ayarlar</span><span className="text-[0.7rem] text-muted-foreground">Bildirim tercihlerini yönetin</span></span>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" className="gap-2.5 px-2.5 py-2" disabled={isPending} onClick={onSignOut}>
            <span className="flex size-7 items-center justify-center rounded-md bg-destructive/10">{isPending ? <LoaderCircleIcon className="animate-spin" /> : <LogOutIcon />}</span>
            <span>{isPending ? "Çıkış yapılıyor..." : "Çıkış Yap"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initialNotificationPreferences={initialNotificationPreferences}
      />
    </>
  );
}
