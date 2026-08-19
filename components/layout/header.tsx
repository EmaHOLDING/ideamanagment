import Link from "next/link";
import { LightbulbIcon } from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";

export function Header({
  displayName,
  email,
  initialEmailNotificationsEnabled,
  children,
}: {
  displayName: string;
  email: string;
  initialEmailNotificationsEnabled: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/90 px-3 backdrop-blur-md sm:px-4">
      <Link
        href="/workspaces"
        aria-label="Fikir Kuluçkası ana sayfa"
        className="flex min-w-0 items-center gap-2 text-sm font-semibold"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LightbulbIcon className="size-4" />
        </span>
        <span className="truncate">Fikir Kuluçkası</span>
      </Link>
      <div className="flex items-center gap-2">
        {children}
        <UserMenu
          displayName={displayName}
          email={email}
          initialEmailNotificationsEnabled={initialEmailNotificationsEnabled}
        />
      </div>
    </header>
  );
}
