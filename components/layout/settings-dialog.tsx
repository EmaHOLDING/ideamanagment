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
import { setNotificationPreference } from "@/app/actions/userSettingsActions";
import { NOTIFICATION_EVENTS, EMAIL_ELIGIBLE_EVENT_TYPES, type NotificationEventType } from "@/lib/notification-registry";

export function SettingsDialog({
  open,
  onOpenChange,
  initialNotificationPreferences,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialNotificationPreferences: Record<NotificationEventType, boolean>;
}) {
  const [preferences, setPreferences] = useState(initialNotificationPreferences);
  const [, startTransition] = useTransition();
  const { theme, setTheme } = useTheme();

  function onPreferenceChange(eventType: NotificationEventType, checked: boolean) {
    setPreferences((prev) => ({ ...prev, [eventType]: checked }));
    startTransition(async () => {
      try {
        await setNotificationPreference(eventType, checked);
      } catch (err) {
        setPreferences((prev) => ({ ...prev, [eventType]: !checked }));
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
            Uygulamada değilken hangi olaylar için e-posta almak istediğinizi olay bazında
            yönetebilirsiniz.
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
        <div className="flex flex-col gap-2">
          <Label className="text-sm">E-posta Bildirimleri</Label>
          <div className="flex flex-col gap-2">
            {EMAIL_ELIGIBLE_EVENT_TYPES.map((eventType) => {
              const config = NOTIFICATION_EVENTS[eventType];
              return (
                <label key={eventType} className="flex items-center gap-2.5 rounded-lg border p-3">
                  <Checkbox
                    checked={preferences[eventType]}
                    onCheckedChange={(checked) => onPreferenceChange(eventType, checked === true)}
                  />
                  <div className="flex flex-col gap-0.5">
                    <Label className="text-sm">{config.label}</Label>
                    <span className="text-xs text-muted-foreground">{config.description}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
