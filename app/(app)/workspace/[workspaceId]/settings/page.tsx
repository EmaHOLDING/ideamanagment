import { redirect } from "next/navigation";
import { getWorkspaceForUser, getWorkspaceMembers } from "@/app/actions/workspaceActions";
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

  const members = await getWorkspaceMembers(workspaceId);

  return (
    <WorkspaceSettingsView
      workspaceId={workspaceId}
      title={workspace.title}
      createdAt={workspace.created_at}
      inviteCode={workspace.invite_code}
      defaultInviteRole={workspace.default_invite_role}
      isOwner={workspace.isOwner}
      currentMembers={members}
    />
  );
}
