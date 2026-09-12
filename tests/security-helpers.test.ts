import { describe, expect, it } from "vitest";
import { sanitizeReturnUrl } from "@/app/auth/callback/route";
import { buildCsp } from "@/proxy";
import { normalizeIdeaMarkdown } from "@/lib/markdown";

describe("sanitizeReturnUrl", () => {
  it("uygulama ici goreli yollari korur", () => {
    expect(sanitizeReturnUrl("/workspace/abc")).toBe("/workspace/abc");
    expect(sanitizeReturnUrl("/workspaces?x=1")).toBe("/workspaces?x=1");
  });

  it("deger yoksa guvenli varsayilana duser", () => {
    expect(sanitizeReturnUrl(null)).toBe("/workspaces");
    expect(sanitizeReturnUrl("")).toBe("/workspaces");
  });

  const acikYonlendirmeDenemeleri = [
    "//evil.com",              // protokol-goreli
    "/\\evil.com",             // ters egik cizgi hilesi
    "https://evil.com",        // mutlak URL
    "http://evil.com/x",
    "javascript:alert(1)",
  ];

  it.each(acikYonlendirmeDenemeleri)("open-redirect denemesini reddeder: %s", (raw) => {
    expect(sanitizeReturnUrl(raw)).toBe("/workspaces");
  });
});

describe("buildCsp", () => {
  const nonce = "test-nonce-degeri";

  it("script-src'i nonce'a baglar ve unsafe-inline vermez", () => {
    const csp = buildCsp(nonce, false);
    expect(csp).toContain(`'nonce-${nonce}'`);
    const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src"))!;
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).toContain("'strict-dynamic'");
  });

  it("uretimde unsafe-eval icermez, dev'de icerir", () => {
    // React dev'de hata yiginlarini yeniden kurmak icin eval kullaniyor.
    expect(buildCsp(nonce, false)).not.toContain("'unsafe-eval'");
    expect(buildCsp(nonce, true)).toContain("'unsafe-eval'");
  });

  it("style-src'a nonce KOYMAZ", () => {
    // Nonce varken tarayicilar 'unsafe-inline'i yok sayar; bu da proje
    // renkleri gibi satir ici style attribute'larini kirardi.
    const styleSrc = buildCsp(nonce, false).split("; ").find((d) => d.startsWith("style-src"))!;
    expect(styleSrc).not.toContain("nonce");
    expect(styleSrc).toContain("'unsafe-inline'");
  });

  it("clickjacking ve base-tag enjeksiyonunu kapatir", () => {
    const csp = buildCsp(nonce, false);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("object-src 'none'");
  });

  it("yerelde upgrade-insecure-requests eklemez", () => {
    // Eklenseydi Supabase'e giden http istekleri https'e yukseltilip kirilirdi.
    expect(buildCsp(nonce, true)).not.toContain("upgrade-insecure-requests");
    expect(buildCsp(nonce, false)).toContain("upgrade-insecure-requests");
  });
});

describe("normalizeIdeaMarkdown", () => {
  it("baslik seviyelerini h3'e indirger", () => {
    expect(normalizeIdeaMarkdown("# Baslik")).toBe("### Baslik");
    expect(normalizeIdeaMarkdown("###### Baslik")).toBe("### Baslik");
  });

  it("satir ici HTML basliklarini da indirger", () => {
    expect(normalizeIdeaMarkdown("<h1>Baslik</h1>")).toBe("### Baslik");
  });

  it("tipografiyi bozan style'lari temizler", () => {
    const cikti = normalizeIdeaMarkdown('<span style="font-size: 90px">buyuk</span>');
    expect(cikti).not.toContain("font-size");
  });

  it("satir sonlarini normalize eder", () => {
    expect(normalizeIdeaMarkdown("a\r\nb")).toBe("a\nb");
  });
});
