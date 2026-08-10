"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptWorkspaceInvite, rejectWorkspaceInvite } from "@/app/actions/workspaceActions";
import { WORKSPACE_ROLE_LABELS } from "@/lib/status";
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

export function PendingWorkspaceCard({
  id,
  title,
  role,
  memberCount,
}: {
  id: string;
  title: string;
  role: Database["public"]["Enums"]["workspace_role"];
  memberCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);

  function onAccept() {
    startTransition(async () => {
      try {
        await acceptWorkspaceInvite(id);
        toast.success("Davet kabul edildi");
        setHidden(true);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Davet kabul edilemedi");
      }
    });
  }

  function onReject() {
    startTransition(async () => {
      try {
        await rejectWorkspaceInvite(id);
        toast.success("Davet reddedildi");
        setHidden(true);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Davet reddedilemedi");
      }
    });
  }

  if (hidden) return null;

  return (
    <Card className="overflow-hidden py-0">
      <div className={`h-1.5 w-full ${accentClassFor(id)}`} />
      <CardHeader className="pt-5">
        <CardTitle className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
            {title.charAt(0).toUpperCase()}
          </span>
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <UsersIcon className="size-3.5" />
          {memberCount} kişi zaten burada · Size atanacak rol:{" "}
          <span className="font-medium text-foreground">{WORKSPACE_ROLE_LABELS[role]}</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={isPending} onClick={onAccept}>
            Kabul Et
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onReject}>
            Reddet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
