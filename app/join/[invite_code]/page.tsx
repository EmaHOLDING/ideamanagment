import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinWorkspaceByInviteCode } from "@/app/actions/workspaceActions";
import { Button } from "@/components/ui/button";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ invite_code: string }>;
}) {
  const { invite_code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?returnUrl=${encodeURIComponent(`/join/${invite_code}`)}`);
  }

  let workspaceId: string | null = null;
  let errorMessage: string | null = null;

  try {
    const workspace = await joinWorkspaceByInviteCode(invite_code);
    workspaceId = workspace.id;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Katılım sırasında bir hata oluştu.";
  }

  if (workspaceId) {
    redirect(`/workspace/${workspaceId}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Katılım Başarısız</h1>
      <p className="text-muted-foreground">{errorMessage}</p>
      <Button render={<Link href="/workspaces">Workspace&apos;lerime dön</Link>} />
    </div>
  );
}
