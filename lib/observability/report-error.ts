/** Merkezi hata raporlama.
 *
 * Şu an iki hedefe yazıyor:
 *  1. Yapılandırılmış tek satırlık JSON log (stderr) — barındırma
 *     platformunun log arayüzünden `[error-report]` ile aranabilir.
 *  2. ERROR_WEBHOOK_URL tanımlıysa oraya POST (Sentry/Slack/kendi
 *     toplayıcın fark etmez).
 *
 * ÖNEMLİ: İstek başlıkları (headers) bilerek raporlanmıyor — oturum
 * çerezi ve Authorization başlığı taşıdıkları için dış bir hedefe
 * gönderilmeleri sızıntı olur. Sadece yol/metot gibi tanımlayıcı
 * alanlar iletiliyor.
 */

export type ErrorReport = {
  source: "server" | "client";
  message: string;
  stack?: string;
  /** Next.js'in ürettiği hata özeti — tarayıcıdaki "ERROR 12345@ABC"
   * ifadesiyle sunucu logunu eşleştirmeyi sağlar. */
  digest?: string;
  path?: string;
  method?: string;
  /** 'render' | 'route' | 'action' | 'proxy' */
  routeType?: string;
  routePath?: string;
};

function toLogLine(report: ErrorReport) {
  return JSON.stringify({
    tag: "error-report",
    at: new Date().toISOString(),
    ...report,
  });
}

/** İnsan tarafından okunabilir özet — Slack/Discord bildirimi için. */
function toHumanMessage(report: ErrorReport) {
  const where = [report.method, report.path].filter(Boolean).join(" ");
  const lines = [
    `🔴 *${report.source === "server" ? "Sunucu" : "İstemci"} hatası*`,
    `${report.message}`,
    where ? `\`${where}\`` : null,
    report.routeType ? `tür: ${report.routeType}` : null,
    report.digest ? `kod: ${report.digest}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

/** Aynı hatanın tekrar tekrar mail üretmesini engelleyen eşikleme.
 *
 * Bellekte tutuluyor (veritabanında değil) çünkü hataların en olası
 * sebeplerinden biri veritabanının kendisidir — eşik kontrolünü oraya
 * bağlamak, sorun anında raporlamayı da çökertirdi. Bedeli: birden fazla
 * sunucu örneği varsa her biri kendi sayacını tutar, yani aynı hata için
 * örnek sayısı kadar mail gelebilir. Kabul edilebilir bir denge. */
const EMAIL_THROTTLE_MS = 60 * 60 * 1000; // aynı hata için saatte 1 mail
const lastEmailedAt = new Map<string, number>();

function errorSignature(report: ErrorReport) {
  return [report.source, report.routeType ?? "", report.path ?? "", report.message].join("|");
}

function shouldEmail(report: ErrorReport) {
  const signature = errorSignature(report);
  const now = Date.now();
  const previous = lastEmailedAt.get(signature);
  if (previous && now - previous < EMAIL_THROTTLE_MS) return false;
  lastEmailedAt.set(signature, now);

  // Sonsuz büyümeyi önle: eski kayıtları ayıkla.
  if (lastEmailedAt.size > 500) {
    for (const [key, at] of lastEmailedAt) {
      if (now - at > EMAIL_THROTTLE_MS) lastEmailedAt.delete(key);
    }
  }
  return true;
}

function alertEmailHtml(report: ErrorReport) {
  const row = (label: string, value?: string) =>
    value
      ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px;white-space:nowrap;">${label}</td><td style="padding:4px 0;font-size:13px;font-family:ui-monospace,monospace;word-break:break-all;">${value}</td></tr>`
      : "";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a2e;">
      <div style="font-size: 13px; font-weight: 600; letter-spacing: 0.02em; color: #b91c1c; margin-bottom: 16px;">FİKİR KULUÇKASI · HATA</div>
      <div style="font-size: 15px; line-height: 1.5; margin-bottom: 20px; font-weight: 600;">${report.message}</div>
      <table style="border-collapse:collapse;margin-bottom:20px;">
        ${row("Kaynak", report.source === "server" ? "Sunucu" : "İstemci")}
        ${row("Yol", [report.method, report.path].filter(Boolean).join(" "))}
        ${row("Rota", report.routePath)}
        ${row("Tür", report.routeType)}
        ${row("Hata kodu", report.digest)}
      </table>
      ${
        report.stack
          ? `<pre style="background:#f4f4f5;padding:12px;border-radius:8px;font-size:11px;line-height:1.5;overflow-x:auto;white-space:pre-wrap;word-break:break-all;color:#3f3f46;">${report.stack.slice(0, 2000)}</pre>`
          : ""
      }
      <div style="font-size: 12px; color: #6b7280; margin-top: 24px;">
        Aynı hata için saatte en fazla bir bildirim gönderilir. Bu uyarıları kapatmak için sunucudaki ERROR_ALERT_EMAIL değişkenini kaldırmanız yeterli.
      </div>
    </div>
  `;
}

async function sendAlertEmail(report: ErrorReport) {
  const to = process.env.ERROR_ALERT_EMAIL;
  if (!to) return;
  if (!shouldEmail(report)) return;

  try {
    // Dinamik import: bu modül Edge runtime'da da yüklenebiliyor, oysa
    // resend istemcisi server-only. Yalnızca gerçekten mail atarken
    // yükleyerek gereksiz bağımlılığı önlüyoruz.
    const { getResendClient } = await import("@/lib/resend");
    const resend = getResendClient();
    if (!resend) return;

    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject: `[Hata] ${report.message.slice(0, 120)}`,
      html: alertEmailHtml(report),
    });
  } catch {
    // Raporlayıcının kendisi asla hata üretmemeli.
  }
}

export async function reportError(report: ErrorReport): Promise<void> {
  // 1) Her zaman logla. Bu, hiçbir dış servis kurulmasa bile üretimde
  //    hatanın kaydını bırakır.
  console.error(`[error-report] ${toLogLine(report)}`);

  // 2) ERROR_ALERT_EMAIL tanımlıysa uyarı maili (aynı hata için saatte 1).
  await sendAlertEmail(report);

  // 3) Toplayıcı tanımlıysa ilet. Raporlamanın kendisi patlarsa asıl
  //    isteği bozmamalı.
  const webhookUrl = process.env.ERROR_WEBHOOK_URL;
  if (!webhookUrl) return;

  const summary = toHumanMessage(report);

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Tek gövde üç hedefi birden karşılıyor: Slack `text`, Discord
      // `content`, kendi toplayıcın ise `detail` içindeki yapılandırılmış
      // veriyi okur. İkisi de tanımadığı anahtarları yok sayar.
      body: JSON.stringify({
        text: summary,
        content: summary,
        detail: {
          tag: "error-report",
          at: new Date().toISOString(),
          ...report,
        },
      }),
    });
  } catch {
    // Sessizce yut — hata raporlayıcının kendisi hata üretmemeli.
  }
}
