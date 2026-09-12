"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** `nonce`, next-themes'in temayı ilk boyamadan önce uygulamak için
 * bastığı satır içi script'e geçiyor — CSP script-src nonce tabanlı
 * olduğu için bu olmadan script bloklanır ve sayfa tema flash'ı yaşar
 * (bkz. proxy.ts). */
export function ThemeProvider({
  children,
  nonce,
}: {
  children: React.ReactNode;
  nonce?: string;
}) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem nonce={nonce}>
      {children}
    </NextThemesProvider>
  );
}
