"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { RefreshCwIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { regenerateInviteCode, setDefaultInviteRole } from "@/app/actions/workspaceActions";
import { WORKSPACE_ROLE_LABELS, ASSIGNABLE_WORKSPACE_ROLES } from "@/lib/status";
import type { Database } from "@/lib/types/database.types";

type AssignableRole = "MEMBER" | "ADMIN" | "VIEWER";
type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

export function InviteSettingsSection({
  workspaceId,
  inviteCode,
  defaultInviteRole,
  isOwner,
}: {
  workspaceId: string;
  inviteCode: string;
  defaultInviteRole: WorkspaceRole;
  isOwner: boolean;
}) {
  const [code, setCode] = useState(inviteCode);
  const [defaultRole, setDefaultRole] = useState<WorkspaceRole>(defaultInviteRole);
  const [isPending, startTransition] = useTransition();

  function onRegenerateCode() {
    startTransition(async () => {
      try {
        const updated = await regenerateInviteCode(workspaceId);
        setCode(updated.invite_code);
        toast.success("Davet kodu yenilendi");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Davet kodu yenilenemedi");
      }
    });
  }

  function onDefaultRoleChange(role: AssignableRole) {
    startTransition(async () => {
      try {
        await setDefaultInviteRole(workspaceId, role);
        setDefaultRole(role);
        toast.success("Varsayılan rol güncellendi");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Varsayılan rol güncellenemedi");
      }
    });
  }

  function onCopyLink() {
    const url = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Davet linki kopyalandı");
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">Davet</h2>
        <p className="text-sm text-muted-foreground">
          Yeni üyelerin bu workspace&apos;e nasıl katılacağını yönetin.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Davet Kodu</Label>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border bg-muted/40 px-2.5 py-1.5 font-mono text-sm">{code}</span>
          <Button type="button" variant="outline" size="sm" onClick={onCopyLink}>
            <CopyIcon /> Linki Kopyala
          </Button>
          {isOwner && (
            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onRegenerateCode}>
              <RefreshCwIcon /> Kodu Yenile
            </Button>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="flex flex-col gap-2">
          <Label>Davetle Katılanların Varsayılan Rolü</Label>
          <Select
            value={defaultRole}
            onValueChange={(v) => v && onDefaultRoleChange(v as AssignableRole)}
            disabled={isPending}
          >
            <SelectTrigger size="sm" className="w-48">
              <SelectValue>{() => WORKSPACE_ROLE_LABELS[defaultRole]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_WORKSPACE_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {WORKSPACE_ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
