"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { RefreshCwIcon, CopyIcon, MailIcon, LinkIcon, LoaderCircleIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  regenerateInviteCode,
  sendWorkspaceInviteEmail,
  setDefaultInviteRole,
} from "@/app/actions/workspaceActions";
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
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSendingInvite, startInviteTransition] = useTransition();

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

  function onSendInvite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    startInviteTransition(async () => {
      try {
        await sendWorkspaceInviteEmail(workspaceId, trimmed);
        toast.success("Davet e-postası gönderildi");
        setEmail("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Davet e-postası gönderilemedi");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="border-b px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold">Davet</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Yeni üyelerin bu workspace&apos;e nasıl katılacağını yönetin.
        </p>
      </div>

      <div className="divide-y">
        <section className="grid gap-3 px-5 py-5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-6 sm:px-6">
          <div>
            <Label htmlFor="invite-email">E-posta ile davet</Label>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Katılım bağlantısını doğrudan ekip arkadaşınıza gönderin.
            </p>
          </div>
          <form onSubmit={onSendInvite} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@sirket.com"
              className="min-w-0 flex-1"
            />
            <Button
              type="submit"
              size="sm"
              className="shrink-0 self-start"
              disabled={isSendingInvite || !email.trim()}
            >
              {isSendingInvite ? <LoaderCircleIcon className="animate-spin" /> : <MailIcon />}
              Davet Gönder
            </Button>
          </form>
        </section>

        <section className="grid gap-3 px-5 py-5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-6 sm:px-6">
          <div>
            <Label>Davet bağlantısı</Label>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Bağlantıya sahip kullanıcılar belirlenen rolle katılabilir.
            </p>
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/25 p-2">
              <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
              <code className="min-w-0 flex-1 truncate font-mono text-sm" title={code}>{code}</code>
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onCopyLink}>
                <CopyIcon /> <span className="hidden sm:inline">Kopyala</span>
              </Button>
            </div>
            {isOwner && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 text-muted-foreground"
                disabled={isPending}
                onClick={onRegenerateCode}
              >
                {isPending ? <LoaderCircleIcon className="animate-spin" /> : <RefreshCwIcon />}
                Davet kodunu yenile
              </Button>
            )}
          </div>
        </section>

        {isOwner && (
          <section className="grid gap-3 px-5 py-5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-6 sm:px-6">
            <div>
              <Label>Varsayılan rol</Label>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Davet bağlantısıyla katılan yeni üyelerin ilk erişim düzeyi.
              </p>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <ShieldCheckIcon className="size-4 shrink-0 text-muted-foreground" />
              <Select
                value={defaultRole}
                onValueChange={(v) => v && onDefaultRoleChange(v as AssignableRole)}
                disabled={isPending}
              >
                <SelectTrigger size="sm" className="w-full max-w-56">
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
          </section>
        )}
      </div>
    </div>
  );
}
