import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { withAuthRetry } from "@/app/actions/_shared";

/** Google girisinden hemen sonra mint edilen JWT'nin "iat" degeri
 * PostgREST'in saatine gore gelecekte kalabiliyor (PGRST303). withAuthRetry
 * bunu artan gecikmeyle yutuyor; asagidaki testler hem yuttugunu hem de
 * GERCEK yetki hatalarini yutmadigini sabitliyor -- ikincisi daha onemli,
 * cunku sessizce yutulursa yetki hatasi gizlenmis olur. */
describe("withAuthRetry", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function calistir<T>(fn: () => Promise<T>) {
    // Red durumunu SENKRON olarak yakaliyoruz: aksi halde zamanlayicilar
    // ilerletilirken promise bir an "unhandled rejection" olarak gorunuyor.
    const sonuc = withAuthRetry(fn).then(
      (deger) => ({ basarili: true as const, deger }),
      (hata: unknown) => ({ basarili: false as const, hata })
    );
    // Sahte zamanlayicida bekleyen tum setTimeout'lari ilerlet.
    await vi.runAllTimersAsync();
    const r = await sonuc;
    if (!r.basarili) throw r.hata;
    return r.deger;
  }

  const gecici = (kod: string) => Object.assign(new Error("gecici"), { code: kod });

  it("ilk denemede basarili olursa tekrar denemez", async () => {
    const fn = vi.fn().mockResolvedValue("tamam");
    await expect(calistir(fn)).resolves.toBe("tamam");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("PGRST303'ten sonra tekrar deneyip basariyi dondurur", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(gecici("PGRST303"))
      .mockRejectedValueOnce(gecici("PGRST303"))
      .mockResolvedValue("tamam");
    await expect(calistir(fn)).resolves.toBe("tamam");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('"JWT issued at future" mesajini da gecici sayar', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("JWT issued at future time"))
      .mockResolvedValue("tamam");
    await expect(calistir(fn)).resolves.toBe("tamam");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("surekli gecici hata verirse sonsuz donmez, sonunda firlatir", async () => {
    const fn = vi.fn().mockRejectedValue(gecici("PGRST303"));
    await expect(calistir(fn)).rejects.toThrow("gecici");
    // 1 ilk deneme + 3 yeniden deneme
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("GERCEK yetki hatasini yutmaz, hic beklemeden firlatir", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Bu islem icin giris yapmis olmaniz gerekiyor."));
    await expect(calistir(fn)).rejects.toThrow("giris yapmis");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("veritabani hatalarini yutmaz", async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error("duplicate key"), { code: "23505" }));
    await expect(calistir(fn)).rejects.toThrow("duplicate key");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
