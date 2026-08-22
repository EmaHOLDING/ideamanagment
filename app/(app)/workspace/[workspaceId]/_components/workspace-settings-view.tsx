"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  SettingsIcon,
  UsersIcon,
  LayoutGridIcon,
  TagIcon,
  LinkIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GeneralSettingsSection } from "./general-settings-section";
import { MembersSettingsSection } from "./members-settings-section";
import { ColumnsSettingsSection } from "./columns-settings-section";
import { TagsSettingsSection } from "./tags-settings-section";
import { InviteSettingsSection } from "./invite-settings-section";
import { DangerZoneSection } from "./danger-zone-section";
import type { getWorkspaceMembers } from "@/app/actions/workspaceActions";
import type { getWorkspaceTags } from "@/app/actions/tagActions";
import type { Database } from "@/lib/types/database.types";

type Member = Awaited<ReturnType<typeof getWorkspaceMembers>>[number];
type Tag = Awaited<ReturnType<typeof getWorkspaceTags>>[number];
type ColumnRow = Database["public"]["Tables"]["kanban_columns"]["Row"];
type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

const SETTINGS_SECTIONS = [
  { id: "general", label: "Genel", icon: SettingsIcon },
  { id: "members", label: "Üyeler", icon: UsersIcon },
  { id: "columns", label: "Kolonlar", icon: LayoutGridIcon },
  { id: "tags", label: "Etiketler", icon: TagIcon },
  { id: "invite", label: "Davet", icon: LinkIcon },
  { id: "danger", label: "Tehlikeli Alan", icon: TriangleAlertIcon },
] as const;

type SectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

export function WorkspaceSettingsView({
  workspaceId,
  title,
  description,
  createdAt,
  inviteCode,
  defaultInviteRole,
  isOwner,
  currentMembers,
  currentColumns,
  currentTags,
}: {
  workspaceId: string;
  title: string;
  description: string | null;
  createdAt: string;
  inviteCode: string;
  defaultInviteRole: WorkspaceRole;
  isOwner: boolean;
  currentMembers: Member[];
  currentColumns: ColumnRow[];
  currentTags: Tag[];
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
    <div className="mx-auto flex w-full max-w-[64rem] flex-col gap-7 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex items-center gap-3">
        <Link
          href={`/workspace/${workspaceId}`}
          aria-label="Panoya dön"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
        </Link>
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {title}
          </p>
          <h1 className="truncate text-xl font-semibold tracking-tight">Workspace Ayarları</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[13rem_minmax(0,44rem)] lg:gap-8">
        <nav
          aria-label="Workspace ayar bölümleri"
          className="scrollbar-subtle -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:sticky lg:top-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {SETTINGS_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSection(s.id)}
              aria-current={section === s.id ? "page" : undefined}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-left text-sm transition-colors",
                section === s.id
                  ? "bg-accent font-medium text-accent-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                s.id === "danger" && section !== s.id && "text-destructive/70 hover:text-destructive"
              )}
            >
              <s.icon className="size-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 w-full">
          {section === "general" && (
            <GeneralSettingsSection
              workspaceId={workspaceId}
              title={title}
              description={description}
              createdAt={createdAt}
              isOwner={isOwner}
            />
          )}
          {section === "members" && (
            <MembersSettingsSection
              workspaceId={workspaceId}
              isOwner={isOwner}
              initialMembers={currentMembers}
            />
          )}
          {section === "columns" && (
            <ColumnsSettingsSection workspaceId={workspaceId} initialColumns={currentColumns} />
          )}
          {section === "tags" && (
            <TagsSettingsSection workspaceId={workspaceId} initialTags={currentTags} />
          )}
          {section === "invite" && (
            <InviteSettingsSection
              workspaceId={workspaceId}
              inviteCode={inviteCode}
              defaultInviteRole={defaultInviteRole}
              isOwner={isOwner}
            />
          )}
          {section === "danger" && (
            <DangerZoneSection workspaceId={workspaceId} workspaceTitle={title} isOwner={isOwner} />
          )}
        </div>
      </div>
    </div>
  );
}
