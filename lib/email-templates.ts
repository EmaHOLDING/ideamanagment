import "server-only";

type EmailContext = {
  actorName: string;
  ideaTitle: string;
  workspaceId: string;
  ideaId: string;
};

function ideaUrl({ workspaceId, ideaId }: EmailContext) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/workspace/${workspaceId}?idea=${ideaId}`;
}

function wrapper(bodyHtml: string, ctaUrl: string, ctaLabel = "Fikri Görüntüle") {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a2e;">
      <div style="font-size: 13px; font-weight: 600; letter-spacing: 0.02em; color: #6d28d9; margin-bottom: 16px;">FİKİR KULUÇKASI</div>
      <div style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">${bodyHtml}</div>
      <a href="${ctaUrl}" style="display: inline-block; background: #6d28d9; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 18px; border-radius: 8px;">${ctaLabel}</a>
      <div style="font-size: 12px; color: #6b7280; margin-top: 28px;">
        E-posta bildirimlerini kapatmak isterseniz uygulama içindeki Ayarlar menüsünden yönetebilirsiniz.
      </div>
    </div>
  `;
}

export function mentionEmailHtml(ctx: EmailContext) {
  return wrapper(
    `<strong>${ctx.actorName}</strong>, '<strong>${ctx.ideaTitle}</strong>' fikrindeki bir yorumda sizi etiketledi.`,
    ideaUrl(ctx)
  );
}

export function assignmentEmailHtml(ctx: EmailContext) {
  return wrapper(
    `<strong>${ctx.actorName}</strong>, '<strong>${ctx.ideaTitle}</strong>' fikrini size atadı.`,
    ideaUrl(ctx)
  );
}

export function commentEmailHtml(ctx: EmailContext) {
  return wrapper(
    `<strong>${ctx.actorName}</strong>, '<strong>${ctx.ideaTitle}</strong>' fikrine yorum yaptı.`,
    ideaUrl(ctx)
  );
}

export function ideaMovedEmailHtml(ctx: EmailContext & { targetColumnTitle: string }) {
  return wrapper(
    `<strong>${ctx.actorName}</strong>, '<strong>${ctx.ideaTitle}</strong>' fikrinizi '<strong>${ctx.targetColumnTitle}</strong>' durumuna taşıdı.`,
    ideaUrl(ctx)
  );
}

export function workspaceJoinedEmailHtml({
  actorName,
  workspaceTitle,
  workspaceId,
}: {
  actorName: string;
  workspaceTitle: string;
  workspaceId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return wrapper(
    `<strong>${actorName}</strong>, '<strong>${workspaceTitle}</strong>' workspace'ine katıldı.`,
    `${appUrl}/workspace/${workspaceId}`,
    "Workspace'i Görüntüle"
  );
}

export function workspaceInviteEmailHtml({
  actorName,
  workspaceTitle,
  inviteUrl,
}: {
  actorName: string;
  workspaceTitle: string;
  inviteUrl: string;
}) {
  return wrapper(
    `<strong>${actorName}</strong>, sizi '<strong>${workspaceTitle}</strong>' workspace'ine davet etti.`,
    inviteUrl,
    "Daveti Görüntüle"
  );
}
