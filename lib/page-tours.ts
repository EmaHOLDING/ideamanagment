/** Sayfa turları: "?" menüsündeki "Bu sayfayı tanıt" ile açılan, ekrandaki
 * gerçek butonları sırayla aydınlatıp anlatan turlar.
 *
 * Metinleri değiştirmek için yalnızca bu dosyayı düzenlemek yeterli.
 *
 * Her adımın `targets` listesi, aydınlatılacak elemanın `data-tour`
 * değeridir. Tur, listede EKRANDA GÖRÜNEN ilk elemanı seçer; hiçbiri
 * görünmüyorsa adım kendiliğinden atlanır. Böylece:
 *   - rolü gereği butonu görmeyen kullanıcıya o adım gösterilmez
 *     (ör. izleyici "Fikir Ekle"yi görmez),
 *   - masaüstünde ve mobilde farklı eleman aydınlatılabilir
 *     (ör. mobilde Genel Bakış/Projeler/Arşiv ☰ menünün içinde),
 *   - boş ekranda farklı bir anlatım yapılabilir.
 * Bir hedef kendi `title`/`body`'sini verirse adımın varsayılan metni
 * yerine o kullanılır.
 *
 * Yeni bir eleman eklerken bileşene `data-tour="..."` vermeyi unutma;
 * CSS sınıflarına bağlanmıyoruz ki tasarım değişince tur sessizce bozulmasın.
 */

export type PageTourId = "workspaces" | "board";

export type PageTourTarget = {
  id: string;
  title?: string;
  body?: string;
};

export type PageTourStep = {
  targets: PageTourTarget[];
  title: string;
  body: string;
};

export const PAGE_TOURS: Record<PageTourId, { label: string; steps: PageTourStep[] }> = {
  workspaces: {
    label: "Workspace'ler sayfası",
    steps: [
      {
        targets: [{ id: "ws-create" }],
        title: "Yeni workspace",
        body: "Ekibin için yeni bir çalışma alanını buradan açarsın. Şablon seçersen kolonlar hazır gelir.",
      },
      {
        targets: [{ id: "ws-pending" }],
        title: "Bekleyen davetler",
        body: "Davet edildiğin workspace'ler onayını bekler. “Kabul Et” ile katılır, istemiyorsan reddedersin.",
      },
      {
        targets: [
          { id: "ws-list" },
          {
            id: "ws-empty",
            body: "Henüz bir workspace'in yok. Yeni bir tane oluşturduğunda ya da bir davete katıldığında burada görünecek.",
          },
        ],
        title: "Workspace'lerin",
        body: "Üyesi olduğun alanlar burada. Bir karta tıklayınca o workspace'in panosuna geçersin.",
      },
      {
        targets: [{ id: "notifications" }],
        title: "Bildirimler",
        body: "Sana atanan fikirler, yorumlar ve seni etiketleyen mesajlar burada toplanır.",
      },
      {
        targets: [{ id: "account-menu" }],
        title: "Hesabın",
        body: "Ayarlar'dan açık ya da koyu temayı ve hangi bildirimleri e-postayla alacağını seçebilirsin. Çıkış da buradan yapılır.",
      },
      {
        targets: [{ id: "help-button" }],
        title: "Yardım hep burada",
        body: "Bu sayfanın turunu ya da uygulamanın genel turunu buradan istediğin zaman yeniden açabilirsin.",
      },
    ],
  },
  board: {
    label: "Pano",
    steps: [
      {
        targets: [{ id: "board-filters" }],
        title: "Arama ve filtreler",
        body: "Fikirleri başlığa göre ara; etikete, atanan kişiye ya da projeye göre daralt.",
      },
      {
        targets: [{ id: "board-column" }],
        title: "Kolonlar",
        body: "Her kolon bir aşama. Başlıktaki rozet, o aşamanın durumunu gösterir.",
      },
      {
        targets: [
          { id: "board-idea-card" },
          {
            id: "board-idea-card-readonly",
            body: "Karta tıklayınca detayı açılır; yorumları, oyları ve fikrin geçmişini orada görürsün.",
          },
        ],
        title: "Fikir kartları",
        body: "Karta tıklayınca detayı açılır; yorum, oy, atama ve geçmiş orada. Kartı sürükleyip başka bir kolona bırakarak aşamasını değiştirirsin.",
      },
      {
        targets: [{ id: "board-add-idea" }],
        title: "Fikir ekle",
        body: "Bu kolona yeni bir fikir ekler. Başlık yeterli, gerisini sonra tamamlayabilirsin.",
      },
      {
        targets: [{ id: "board-add-column" }],
        title: "Yeni kolon",
        body: "Akışına yeni bir aşama ekler. Kolonları Ayarlar'dan yeniden sıralayabilirsin.",
      },
      {
        targets: [
          { id: "board-nav-links" },
          {
            id: "board-nav-menu",
            title: "Menü",
            body: "Genel Bakış, Projeler, Arşiv ve Dışarı Aktar bu menüde.",
          },
        ],
        title: "Genel Bakış, Projeler, Arşiv",
        body: "Genel Bakış'ta durumun özetini, Projeler'de proje listesini, Arşiv'de arşivlenmiş fikir ve projeleri bulursun.",
      },
      // Başlıktaki butonlar ekrandaki sırayla (soldan sağa) anlatılıyor.
      {
        targets: [{ id: "board-settings" }],
        title: "Ayarlar",
        body: "Üyeleri, kolonları, etiketleri, projeleri ve davet linkini buradan yönetirsin.",
      },
      {
        targets: [{ id: "board-export" }],
        title: "Dışarı aktar",
        body: "Panoyu paylaşmak için PNG görseli ya da PDF özet raporu olarak indir.",
      },
      {
        targets: [{ id: "board-activity" }],
        title: "Aktivite akışı",
        body: "Workspace'te kim ne yaptı, buradan takip edersin. Kişiye ve işlem türüne göre filtreleyebilirsin.",
      },
    ],
  },
};

/** Sayfa yolundan o sayfanın turunu bulur. Pano turu yalnızca panonun
 * kendisinde (`/workspace/<id>`) geçerli; alt sayfalarda (overview,
 * projects, archive, settings) henüz tur yok. */
export function pageTourIdForPath(pathname: string): PageTourId | null {
  if (pathname === "/workspaces") return "workspaces";
  if (/^\/workspace\/[^/]+\/?$/.test(pathname)) return "board";
  return null;
}
