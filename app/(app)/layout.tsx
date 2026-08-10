import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { SideRail } from "@/components/layout/side-rail";
import { NotificationBell } from "@/components/layout/notification-bell";
import { PresenceHeartbeat } from "@/components/layout/presence-heartbeat";
import { getNotifications } from "@/app/actions/notificationActions";
import { getEmailNotificationsPreference } from "@/app/actions/userSettingsActions";
import { getDisplayName } from "@/lib/user-display";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ items, nextCursor }, emailNotificationsEnabled] = await Promise.all([
    getNotifications(),
    getEmailNotificationsPreference(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <PresenceHeartbeat />
      <Header
        displayName={getDisplayName(user)}
        email={user.email ?? ""}
        initialEmailNotificationsEnabled={emailNotificationsEnabled}
      >
        <NotificationBell
          currentUserId={user.id}
          initialItems={items}
          initialNextCursor={nextCursor}
        />
      </Header>
      <div className="flex flex-1">
        <SideRail />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
