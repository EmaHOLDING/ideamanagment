import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { SideRail } from "@/components/layout/side-rail";
import { NotificationBell } from "@/components/layout/notification-bell";
import { PresenceHeartbeat } from "@/components/layout/presence-heartbeat";
import { HelpButton } from "@/components/layout/help-button";
import { getNotifications } from "@/app/actions/notificationActions";
import { getMyNotificationPreferences, getProductTourStatus } from "@/app/actions/userSettingsActions";
import { getDisplayName } from "@/lib/user-display";
import { PRODUCT_TOUR_VERSION } from "@/lib/tour-steps";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ items, nextCursor }, notificationPreferences, tourStatus] = await Promise.all([
    getNotifications(),
    getMyNotificationPreferences(),
    // Tur durumu okunamazsa bütün uygulama çökmesin: tur kendiliğinden
    // açılmaz, "?" butonu yine çalışır.
    getProductTourStatus().catch(() => ({ completedVersion: PRODUCT_TOUR_VERSION })),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <PresenceHeartbeat />
      <Header
        displayName={getDisplayName(user)}
        email={user.email ?? ""}
        initialNotificationPreferences={notificationPreferences}
      >
        <HelpButton autoOpen={tourStatus.completedVersion < PRODUCT_TOUR_VERSION} />
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
