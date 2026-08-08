import { LightbulbIcon } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-muted/50 to-background px-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <LightbulbIcon className="size-5 text-primary" />
        Fikir Kuluçkası
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
