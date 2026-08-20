/** Bildirim olay tiplerinin tek kaynağı — hem sunucu tarafındaki dispatch
 * mantığı (app/actions/_notifications.ts) hem de tercihler UI'ı
 * (settings-dialog.tsx) buradan besleniyor. Yeni bir bildirim türü eklemek
 * için tek yapılması gereken buraya bir satır eklemek. */
export type NotificationEventType =
  | "mention"
  | "idea_assigned"
  | "comment_added"
  | "idea_moved"
  | "workspace_joined";

export type NotificationEventConfig = {
  /** Tercihler UI'ında gösterilen kısa başlık. */
  label: string;
  /** Tercihler UI'ında başlığın altında gösterilen açıklama. */
  description: string;
  /** Bu olay hiç e-posta gönderebilir mi? false ise tercih UI'ında hiç
   * gösterilmez ve dispatch e-postayı atlar (sadece uygulama içi bildirim). */
  emailEligible: boolean;
  /** Kullanıcının bu olay için hiç tercih kaydı yoksa varsayılan davranış. */
  defaultEmailEnabled: boolean;
};

export const NOTIFICATION_EVENTS: Record<NotificationEventType, NotificationEventConfig> = {
  mention: {
    label: "Yorumda etiketlenme",
    description: "Bir yorumda @ ile etiketlendiğinizde",
    emailEligible: true,
    defaultEmailEnabled: true,
  },
  idea_assigned: {
    label: "Fikir ataması",
    description: "Size bir fikir atandığında",
    emailEligible: true,
    defaultEmailEnabled: true,
  },
  workspace_joined: {
    label: "Workspace katılımları",
    description: "Workspace'inize yeni biri katıldığında",
    emailEligible: true,
    defaultEmailEnabled: false,
  },
  comment_added: {
    label: "Yorumlar",
    description: "Oluşturduğunuz veya daha önce yorum yaptığınız bir fikre yorum geldiğinde",
    emailEligible: true,
    defaultEmailEnabled: false,
  },
  idea_moved: {
    label: "Kart taşıma",
    description: "Oluşturduğunuz bir fikir başka bir duruma taşındığında",
    emailEligible: true,
    defaultEmailEnabled: false,
  },
};

export const EMAIL_ELIGIBLE_EVENT_TYPES = (
  Object.entries(NOTIFICATION_EVENTS) as [NotificationEventType, NotificationEventConfig][]
)
  .filter(([, config]) => config.emailEligible)
  .map(([type]) => type);
