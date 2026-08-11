import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Ek dosyaları (görsel/PDF/vb.) FormData ile server action üzerinden
      // yüklüyoruz; varsayılan 1MB limiti bunu engelliyordu. Uygulamanın
      // dosya başına izin verdiği üst sınırla (10MB, bkz. lib/attachment-client.ts
      // ve app/actions/attachmentActions.ts) eşleştiriyoruz.
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking: sayfa başka bir sitenin iframe'ine gömülemesin.
          { key: "X-Frame-Options", value: "DENY" },
          // Tarayıcının Content-Type'ı "tahmin ederek" MIME sniffing yapmasını engelle.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Dış linklere tıklanınca tam URL (query string dahil) sızdırılmasın.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Kullanılmayan tarayıcı API'lerine (kamera/mikrofon/konum) erişim kapalı.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
