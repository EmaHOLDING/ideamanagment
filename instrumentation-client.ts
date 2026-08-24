/** İstemci tarafı hata yakalama.
 *
 * Ağa hiçbir şey göndermiyor — yakalanan hataları sunucu tarafıyla aynı
 * `[error-report]` etiketiyle konsola yazıyor. Böylece ileride bir
 * toplayıcı (Sentry vb.) eklendiğinde takılacak yer hazır olur ve şu an
 * için kimliği doğrulanmamış bir toplama uç noktası açmış olmuyoruz.
 */

function log(source: string, message: string, stack?: string) {
  console.error(
    `[error-report] ${JSON.stringify({
      tag: "error-report",
      at: new Date().toISOString(),
      source: "client",
      kind: source,
      message,
      stack,
    })}`
  );
}

window.addEventListener("error", (event) => {
  log("window.error", event.message, event.error?.stack);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  log(
    "unhandledrejection",
    reason instanceof Error ? reason.message : String(reason),
    reason instanceof Error ? reason.stack : undefined
  );
});
