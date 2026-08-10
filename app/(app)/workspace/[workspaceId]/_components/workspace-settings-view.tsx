"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  SettingsIcon,
  UsersIcon,
  LayoutGridIcon,
  LinkIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GeneralSettingsSection } from "./general-settings-section";
import { MembersSettingsSection } from "./members-settings-section";
import { InviteSettingsSection } from "./invite-settings-section";
import { DangerZoneSection } from "./danger-zone-section";
import { SaveAsTemplateDialog } from "./save-as-template-dialog";
import type { getWorkspaceMembers } from "@/app/actions/workspaceActions";
import type { Database } from "@/lib/types/database.types";

type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];
type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

const SETTINGS_SECTIONS = [
  { id: "general", label: "Genel", icon: SettingsIcon },
  { id: "members", label: "Üyeler", icon: UsersIcon },
  { id: "columns", label: "Kolonlar", icon: LayoutGridIcon },
  { id: "invite", label: "Davet", icon: LinkIcon },
  { id: "danger", label: "Tehlikeli Alan", icon: TriangleAlertIcon },
] as const;

type SectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

export function WorkspaceSettingsView({
  workspaceId,
  title,
  createdAt,
  inviteCode,
  defaultInviteRole,
  isOwner,
  currentMembers,
}: {
  workspaceId: string;
  title: string;
  createdAt: string;
  inviteCode: string;
  defaultInviteRole: WorkspaceRole;
  isOwner: boolean;
  currentMembers: Member[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialSection = (searchParams.get("section") as SectionId | null) ?? "general";
  const [section, setSection] = useState<SectionId>(
    SETTINGS_SECTIONS.some((s) => s.id === initialSection) ? initialSection : "general"
  );

  function onSelectSection(next: SectionId) {
    setSection(next);
    router.replace(`${pathname}?section=${next}`, { scroll: false });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center gap-2">
        <Link
          href={`/workspace/${workspaceId}`}
          aria-label="Panoya dön"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Workspace Ayarları</h1>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[200px_1fr]">
        <nav className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
          {SETTINGS_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSection(s.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                section === s.id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                s.id === "danger" && section !== s.id && "text-destructive/70 hover:text-destructive"
              )}
            >
              <s.icon className="size-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {section === "general" && (
            <GeneralSettingsSection workspaceId={workspaceId} title={title} createdAt={createdAt} isOwner={isOwner} />
          )}
          {section === "members" && (
            <MembersSettingsSection
              workspaceId={workspaceId}
              isOwner={isOwner}
              initialMembers={currentMembers}
            />
          )}
          {section === "columns" && (
            <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
              <div>
                <h2 className="text-sm font-semibold">Kolon Ayarları</h2>
                <p className="text-sm text-muted-foreground">
                  Bu workspace&apos;in mevcut kolon yapısını, ileride yeni workspace&apos;ler
                  kurarken kullanılabilecek bir şablon olarak kaydedin.
                </p>
              </div>
              <SaveAsTemplateDialog workspaceId={workspaceId} />
            </div>
          )}
          {section === "invite" && (
            <InviteSettingsSection
              workspaceId={workspaceId}
              inviteCode={inviteCode}
              defaultInviteRole={defaultInviteRole}
              isOwner={isOwner}
            />
          )}
          {section === "danger" && <DangerZoneSection workspaceId={workspaceId} isOwner={isOwner} />}
        </div>
      </div>
    </div>
  );
}
