import { describe, expect, it } from "vitest";
import { encodeCursor, decodeCursor } from "@/app/actions/_shared";

/** Cursor'in icerigi PostgREST'in or=(...) filtresine string olarak
 * gomuluyor, yani sekli bozuk bir cursor bir injection yuzeyi. Bu testler
 * dogrulamanin hem mesru sayfalamayi bozmadigini hem de filtre
 * sozdizimini kiran girdileri reddettigini sabitliyor. */
describe("decodeCursor", () => {
  it("kendi urettigi cursor'i geri okur", () => {
    const cursor = { createdAt: "2026-09-12T13:12:56.983454+00:00", id: crypto.randomUUID() };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("bos girdide null doner", () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor("")).toBeNull();
  });

  it("base64 olmayan / bozuk girdide null doner", () => {
    expect(decodeCursor("bu-base64-degil!!")).toBeNull();
    expect(decodeCursor(Buffer.from("{bozuk json").toString("base64url"))).toBeNull();
  });

  const gecerliZamanDamgalari = [
    "2026-09-12T13:12:56.983454+00:00", // PostgREST'in urettigi bicim
    "2026-09-12T13:12:56.983+00:00",
    "2026-09-12T13:12:56+00:00",
    "2026-09-12T13:12:56.983454Z",
    "2026-09-12 13:12:56.983454+03:00",
  ];

  it.each(gecerliZamanDamgalari)("gecerli zaman damgasini kabul eder: %s", (createdAt) => {
    const cursor = { createdAt, id: crypto.randomUUID() };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  const enjeksiyonDenemeleri = [
    { createdAt: "x),or(id.neq.0", id: crypto.randomUUID() },
    { createdAt: "2026-01-01T00:00:00Z),or(user_id.neq.abc", id: crypto.randomUUID() },
    { createdAt: "2026-01-01T00:00:00Z,id.gt.0", id: crypto.randomUUID() },
    { createdAt: "*", id: crypto.randomUUID() },
  ];

  it.each(enjeksiyonDenemeleri)("filtre sozdizimini kiran createdAt'i reddeder: $createdAt", (cursor) => {
    expect(decodeCursor(encodeCursor(cursor))).toBeNull();
  });

  it("UUID olmayan id'yi reddeder", () => {
    const kotu = { createdAt: "2026-09-12T13:12:56.983454+00:00", id: "1),or(id.neq.0" };
    expect(decodeCursor(encodeCursor(kotu))).toBeNull();
  });

  it("eksik alanlari reddeder", () => {
    expect(decodeCursor(Buffer.from(JSON.stringify({ id: crypto.randomUUID() })).toString("base64url"))).toBeNull();
    expect(decodeCursor(Buffer.from(JSON.stringify({ createdAt: "2026-09-12T13:12:56Z" })).toString("base64url"))).toBeNull();
  });

  it("beklenmeyen tipleri reddeder", () => {
    for (const govde of [null, 42, "duz-metin", [], { createdAt: {}, id: [] }]) {
      expect(decodeCursor(Buffer.from(JSON.stringify(govde)).toString("base64url"))).toBeNull();
    }
  });
});
