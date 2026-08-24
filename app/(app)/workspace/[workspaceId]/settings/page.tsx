import { redirect } from "next/navigation";
import { getWorkspaceForUser, getWorkspaceMembers } from "@/app/actions/workspaceActions";
import { getWorkspaceTags } from "@/app/actions/tagActions";
import { getWorkspaceProjects } from "@/app/actions/projectActions";
import { WorkspaceSettingsView } from "../_components/workspace-settings-view";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  const workspace = await getWorkspaceForUser(workspaceId);
  const canManageContent = workspace.isOwner || workspace.role === "ADMIN";

  if (!canManageContent) {
    redirect(`/workspace/${workspaceId}`);
  }

  const [members, tags, projects] = await Promise.all([
    getWorkspaceMembers(workspaceId),
    getWorkspaceTags(workspaceId),
    getWorkspaceProjects(workspaceId),
  ]);

  return (
    <WorkspaceSettingsView
      workspaceId={workspaceId}
      title={workspace.title}
      description={workspace.description}
      createdAt={workspace.created_at}
      inviteCode={workspace.invite_code}
      defaultInviteRole={workspace.default_invite_role}
      isOwner={workspace.isOwner}
      currentMembers={members}
      currentColumns={workspace.kanban_columns}
      currentTags={tags}
      currentProjects={projects}
    />
  );
}
