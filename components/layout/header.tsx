import Link from "next/link";
import { LightbulbIcon } from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";

export function Header({
  email,
  children,
}: {
  email: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm">
      <Link href="/workspaces" className="flex items-center gap-1.5 text-sm font-semibold">
        <LightbulbIcon className="size-4 text-primary" />
        Fikir Kuluçkası
      </Link>
      <div className="flex items-center gap-2">
        {children}
        <UserMenu email={email} />
      </div>
    </header>
  );
}
