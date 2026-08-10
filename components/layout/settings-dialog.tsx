"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { SunIcon, MoonIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setEmailNotificationsEnabled } from "@/app/actions/userSettingsActions";

export function SettingsDialog({
  open,
  onOpenChange,
  initialEmailNotificationsEnabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmailNotificationsEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEmailNotificationsEnabled);
  const [, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();

  function onCheckedChange(checked: boolean) {
    setEnabled(checked);
    startTransition(async () => {
      try {
        await setEmailNotificationsEnabled(checked);
        toast.success("Ayar güncellendi");
      } catch (err) {
        setEnabled(!checked);
        toast.error(err instanceof Error ? err.message : "Ayar güncellenemedi");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ayarlar</DialogTitle>
          <DialogDescription>
            Uygulamada değilken sizi ilgilendiren olaylar için e-posta alıp almayacağınızı
            buradan yönetebilirsiniz.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-2.5 rounded-lg border p-3">
          <div className="flex flex-col gap-0.5">
            <Label className="text-sm">Görünüm</Label>
            <span className="text-xs text-muted-foreground">Açık veya koyu tema seçin.</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <Button
              type="button"
              size="icon-sm"
              variant={theme === "light" ? "default" : "ghost"}
              aria-label="Açık tema"
              onClick={() => setTheme("light")}
            >
              <SunIcon />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant={theme === "dark" ? "default" : "ghost"}
              aria-label="Koyu tema"
              onClick={() => setTheme("dark")}
            >
              <MoonIcon />
            </Button>
          </div>
        </div>
        <label className="flex items-center gap-2.5 rounded-lg border p-3">
          <Checkbox checked={enabled} onCheckedChange={onCheckedChange} />
          <div className="flex flex-col gap-0.5">
            <Label className="text-sm">E-posta Bildirimlerini Aktif Et</Label>
            <span className="text-xs text-muted-foreground">
              Sizi bir yorumda etiketleyen veya size bir fikir atayan olaylar için, sadece
              çevrimdışıyken e-posta gönderilir.
            </span>
          </div>
        </label>
      </DialogContent>
    </Dialog>
  );
}
