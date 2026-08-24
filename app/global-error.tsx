"use client";

/** Kök layout dahil, uygulamanın tamamı çökerse devreye giren son
 * savunma hattı. Kendi <html>/<body>'sini render etmek ZORUNDA ve global
 * stiller buraya ulaşmaz — bu yüzden stiller satır içi yazıldı.
 *
 * Not: Next.js 16.3'te bu bileşenin prop'u `reset` değil `retry`. */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#0b0b0f",
          color: "#e8e8ed",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <div
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#8b8b96",
              marginBottom: "0.75rem",
            }}
          >
            Fikir Kuluçkası
          </div>
          <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem", fontWeight: 600 }}>
            Beklenmeyen bir hata oluştu
          </h1>
          <p style={{ margin: "0 0 1.25rem", color: "#a1a1aa", lineHeight: 1.6, fontSize: "0.9rem" }}>
            Sorun kaydedildi. Tekrar deneyebilir veya sayfayı yenileyebilirsiniz.
          </p>
          <button
            onClick={() => retry()}
            style={{
              cursor: "pointer",
              border: "1px solid #2f2f3a",
              background: "#17171f",
              color: "#e8e8ed",
              borderRadius: "0.5rem",
              padding: "0.5rem 1.1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Tekrar dene
          </button>
          {error.digest && (
            <p style={{ marginTop: "1.25rem", fontSize: "0.7rem", color: "#6b6b76" }}>
              Hata kodu: <code>{error.digest}</code>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
