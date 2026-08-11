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
};

export default nextConfig;
