/** Uygulama turunun içeriği.
 *
 * Metinleri değiştirmek için yalnızca bu dosyayı düzenlemek yeterli.
 * Her adımın görseli `components/layout/product-tour-illustrations.tsx`
 * içinde, `illustration` anahtarıyla eşleşen sahnedir.
 *
 * Tura yeni bir özellik adımı eklediğinde PRODUCT_TOUR_VERSION'ı bir
 * artır: turu daha önce tamamlamış herkese güncel tur bir kez daha
 * kendiliğinden açılır. Yalnızca yazım düzeltmesi yapıyorsan artırma.
 */
export const PRODUCT_TOUR_VERSION = 1;

export type TourIllustration =
  | "welcome"
  | "workspaces"
  | "board"
  | "new-idea"
  | "collaborate"
  | "projects"
  | "live"
  | "find-share"
  | "archive"
  | "done";

export type TourStep = {
  id: string;
  title: string;
  body: string;
  illustration: TourIllustration;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Fikir Kuluçkası'na hoş geldin",
    body: "Ekibinin fikirlerini tek yerde toplayıp birlikte olgunlaştırdığı alan. Birkaç adımda nasıl çalıştığını gösterelim.",
    illustration: "welcome",
  },
  {
    id: "workspaces",
    title: "Workspace'ler ve roller",
    body: "Her ekip kendi workspace'inde çalışır; yeni bir tane oluştur ya da davet linkiyle katıl. Yöneticiler panoyu ve üyeleri düzenler, üyeler fikir ekler, izleyiciler yalnızca görüntüler.",
    illustration: "workspaces",
  },
  {
    id: "board",
    title: "Pano",
    body: "Fikirler kolonlarda aşama aşama ilerler. Bir kartı sürükleyip başka bir kolona bıraktığında durumu güncellenir.",
    illustration: "board",
  },
  {
    id: "new-idea",
    title: "Fikir eklemek",
    body: "Kolonun altındaki “Fikir Ekle” ile başla. Başlık ve açıklama yeterli; istersen problemi, hedef kitleyi, etkiyi ve eforu da belirt ya da bir Markdown dosyası içe aktar.",
    illustration: "new-idea",
  },
  {
    id: "collaborate",
    title: "Fikir üzerinde çalışmak",
    body: "Bir karta tıklayıp detayını aç. Yorum yap, @ ile ekip arkadaşını etiketle, oy ver, birine ata, etiket ekle. Her düzenleme versiyon geçmişinde saklanır.",
    illustration: "collaborate",
  },
  {
    id: "projects",
    title: "Projeler",
    body: "Olgunlaşan bir fikri “Projeye Dönüştür” ile projeye çevir. Sonraki fikirleri o projeye bağlayarak projenin özelliklerini birlikte geliştirin.",
    illustration: "projects",
  },
  {
    id: "live",
    title: "Birlikte, canlı",
    body: "Biri bir kartı düzenliyor ya da taşıyorsa kartın üzerinde adını görürsün. Aktivite akışı ve bildirimler, ekipte olan biteni kaçırmamanı sağlar.",
    illustration: "live",
  },
  {
    id: "find-share",
    title: "Bul, özetle, paylaş",
    body: "Arama ve filtrelerle panoyu daralt. Genel Bakış'ta durumu tek bakışta gör, panoyu PNG ya da PDF olarak dışarı aktar.",
    illustration: "find-share",
  },
  {
    id: "archive",
    title: "Arşiv ve geri alma",
    body: "Sildikten hemen sonra çıkan “Geri Al” ile işlemi geri çevirebilirsin. Biten işleri silmek yerine arşivle; Arşiv sayfasından istediğin zaman geri getir.",
    illustration: "archive",
  },
  {
    id: "done",
    title: "Hazırsın",
    body: "Hepsi bu kadar. Turu istediğin zaman sağ üstteki ? simgesinden yeniden açabilirsin.",
    illustration: "done",
  },
];
