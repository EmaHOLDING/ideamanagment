import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PAGE_TOURS, pageTourIdForPath } from "@/lib/page-tours";

/** Sayfa turu, hedefi bulamadığı adımı SESSİZCE atlıyor (rol ya da ekran
 * genişliği yüzünden olmayan butonlar için bilinçli bir davranış). Bunun
 * bedeli şu: bir bileşenden `data-tour` etiketi silinir ya da yeniden
 * adlandırılırsa tur hiçbir hata vermeden bir adım kaybeder. Bu test o
 * kaybı yakalıyor. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

const allSource = ["app", "components"].flatMap(sourceFiles).map((f) => readFileSync(f, "utf8")).join("\n");

describe("sayfa turu hedefleri", () => {
  const targetIds = Object.values(PAGE_TOURS).flatMap((tour) =>
    tour.steps.flatMap((step) => step.targets.map((t) => t.id))
  );

  // Etiket ya doğrudan (data-tour="x") ya da koşullu bir ifadeyle
  // (data-tour={kosul ? "x" : "y"}) verilebiliyor; ikisini de kabul et.
  const dataTourLines = allSource.split("\n").filter((line) => line.includes("data-tour"));

  it.each([...new Set(targetIds)])("%s etiketi bir bileşende tanımlı", (id) => {
    expect(dataTourLines.some((line) => line.includes(`"${id}"`))).toBe(true);
  });

  it("her adımın en az bir hedefi ve dolu bir metni var", () => {
    for (const tour of Object.values(PAGE_TOURS)) {
      for (const step of tour.steps) {
        expect(step.targets.length).toBeGreaterThan(0);
        expect(step.title.trim()).not.toBe("");
        expect(step.body.trim()).not.toBe("");
      }
    }
  });
});

describe("pageTourIdForPath", () => {
  it("workspace listesini tanır", () => {
    expect(pageTourIdForPath("/workspaces")).toBe("workspaces");
  });

  it("panoyu tanır", () => {
    expect(pageTourIdForPath("/workspace/d5b00fb3-5884-4503-8174-c974eff56f4e")).toBe("board");
    expect(pageTourIdForPath("/workspace/d5b00fb3-5884-4503-8174-c974eff56f4e/")).toBe("board");
  });

  it("panonun alt sayfalarında pano turunu AÇMAZ (orada o butonlar yok)", () => {
    for (const sub of ["overview", "projects", "archive", "settings"]) {
      expect(pageTourIdForPath(`/workspace/abc/${sub}`)).toBeNull();
    }
  });

  it("turu olmayan sayfalarda null döner", () => {
    expect(pageTourIdForPath("/")).toBeNull();
    expect(pageTourIdForPath("/workspace/abc/project/def")).toBeNull();
  });
});
