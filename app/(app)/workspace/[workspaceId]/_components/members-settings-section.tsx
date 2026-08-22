"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CrownIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getWorkspaceMembers,
  removeMember,
  undoRemoveMember,
  transferOwnership,
  updateMemberRole,
} from "@/app/actions/workspaceActions";
import { getInitials } from "@/lib/user-display";
import { WORKSPACE_ROLE_LABELS, ASSIGNABLE_WORKSPACE_ROLES } from "@/lib/status";
import { useRealtimeSubscription } from "@/lib/hooks/use-realtime-subscription";

type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];
type AssignableRole = "MEMBER" | "ADMIN" | "VIEWER";

export function MembersSettingsSection({
  workspaceId,
  isOwner,
  initialMembers,
}: {
  workspaceId: string;
  isOwner: boolean;
  initialMembers: Member[];
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [isPending, startTransition] = useTransition();

  function refreshMembers() {
    getWorkspaceMembers(workspaceId).then(setMembers);
  }

  useRealtimeSubscription(
    `settings-members-${workspaceId}`,
    [{ table: "workspace_members", filter: `workspace_id=eq.${workspaceId}` }],
    () => refreshMembers()
  );

  function onRemove(member: Member) {
    startTransition(async () => {
      try {
        const result = await removeMember(workspaceId, member.user_id);
        refreshMembers();

        function onUndo() {
          undoRemoveMember(workspaceId, member.user_id, result.role)
            .then(() => {
              toast.success("Üye geri eklendi");
              refreshMembers();
            })
            .catch((err) => {
              toast.error(err instanceof Error ? err.message : "Üye geri eklenemedi");
            });
        }

        toast(`${member.fullName} workspace'ten çıkarıldı.`, {
          position: "bottom-center",
          duration: 30000,
          action: { label: "Geri Al", onClick: onUndo },
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Üye çıkarılamadı");
      }
    });
  }

  function onRoleChange(userId: string, role: AssignableRole) {
    startTransition(async () => {
      try {
        await updateMemberRole(workspaceId, userId, role);
        toast.success("Rol güncellendi");
        refreshMembers();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Rol güncellenemedi");
      }
    });
  }

  function onTransfer(userId: string) {
    startTransition(async () => {
      try {
        await transferOwnership(workspaceId, userId);
        toast.success("Sahiplik devredildi");
        refreshMembers();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sahiplik devredilemedi");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold">Üyeler</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Roller ve workspace erişimini yönetin.
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0 gap-1.5 tabular-nums">
          <UsersIcon className="size-3.5" /> {members.length} üye
        </Badge>
      </div>

      <div className="divide-y">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar>
                <AvatarFallback>{getInitials(m.fullName)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{m.fullName}</span>
                {m.email && <span className="truncate text-xs text-muted-foreground">{m.email}</span>}
              </div>
              {m.role === "OWNER" && (
                <Badge variant="outline" className="shrink-0 gap-1">
                  <CrownIcon className="size-3" /> {WORKSPACE_ROLE_LABELS.OWNER}
                </Badge>
              )}
            </div>
            {m.role !== "OWNER" && (
              <div className="flex flex-wrap items-center gap-1.5 pl-11 sm:shrink-0 sm:justify-end sm:pl-0">
                <Select
                  value={m.role}
                  onValueChange={(v) => v && onRoleChange(m.user_id, v as AssignableRole)}
                  disabled={isPending}
                >
                  <SelectTrigger size="sm" className="h-8 min-w-28 text-xs">
                    <SelectValue>{() => WORKSPACE_ROLE_LABELS[m.role]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_WORKSPACE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {WORKSPACE_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isOwner && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={isPending}
                    onClick={() => onTransfer(m.user_id)}
                  >
                    Sahipliği Devret
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  disabled={isPending}
                  onClick={() => onRemove(m)}
                  aria-label="Üyeyi çıkar"
                >
                  <Trash2Icon />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
