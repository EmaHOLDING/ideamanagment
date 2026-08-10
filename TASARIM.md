# Fikir Kuluçkası — Tasarım Referans Dokümanı

Bu belge, mevcut uygulamanın **her ekranını, o ekrandaki her bileşeni/butonu ve ne işe yaradığını** eksiksiz şekilde listeler. Amacı, bir tasarım aracına (Figma AI, v0, vb.) verilip uygulamanın tamamının yeniden tasarlanabilmesini sağlamaktır. Kod içermez; sadece ekran envanteri, bileşen tipi, davranış ve teknoloji/kütüphane bilgisi içerir.

---

## 0. Teknoloji ve Tasarım Sistemi Alt Yapısı

Bu bölüm, tasarım aracının "hangi bileşen kütüphanesiyle üretilebilir/uyumlu olmalı" sorusuna cevap vermesi için var.

- **Framework:** Next.js (React 19, App Router). Sayfa geçişleri client-side, çoğu ekran sunucu tarafında veri çekip client bileşenlere prop olarak geçiyor.
- **Bileşen kütüphanesi:** shadcn/ui, ama **Radix değil `Base UI` (`@base-ui-components/react`)** primitive'leri üzerine kurulu bir varyantı ("base-nova" stili). Yani Dialog/Popover/Select/Dropdown gibi bileşenlerin davranışı (odak yönetimi, portal, klavye navigasyonu) Base UI standartlarına uygun.
- **CSS:** Tailwind CSS v4, `oklch()` renk uzayında tanımlı CSS custom property'ler (`--primary`, `--background` vb.) ile tema değişkenleri. Açık/koyu tema ikisi de tanımlı (`.dark` class'ı ile).
- **İkonlar:** `lucide-react` (çizgisel/outline stil ikon seti — Bold, Italic, Trash2, Plus, Search, Bell, Users, History, vb.).
- **Bildirim/toast sistemi:** `sonner` kütüphanesi — ekranın **alt-orta** noktasında beliren toast bildirimleri (özellikle "Geri Al" aksiyonlu undo toast'ları için kritik).
- **Sürükle-bırak:** `@hello-pangea/dnd` (react-beautiful-dnd fork'u) — sadece Kanban kartlarının kolonlar arası sürüklenmesinde kullanılıyor.
- **Zengin metin editörü:** `Tiptap` (ProseMirror tabanlı) — fikir içeriği için, Markdown'a serileştirip geri okuyan bir yapılandırmayla.
- **Yazı tipi:** Sistem "sans" fontu (Next.js `font-sans` değişkeni); başlıklar için ayrı bir "heading" fontu tanımlı ama şu an sans ile aynı.

### Renk Paleti (Açık Tema)

| Token | Değer (oklch) | Kullanım |
|---|---|---|
| `--background` | `oklch(1 0 0)` — saf beyaz | Sayfa arka planı |
| `--foreground` | `oklch(0.145 0 0)` — neredeyse siyah | Ana metin |
| `--primary` | `oklch(0.55 0.18 265)` — **indigo/mor tonu marka rengi** | Butonlar, linkler, aktif durumlar, focus ring |
| `--primary-foreground` | `oklch(0.985 0 0)` — beyaza yakın | Primary buton üzeri metin |
| `--secondary` / `--muted` | `oklch(0.97 0.005 265)` — çok açık gri-mor | İkincil arka planlar (kolon gövdesi, kart alt bilgisi) |
| `--muted-foreground` | `oklch(0.556 0 0)` — orta gri | İkincil/soluk metin |
| `--accent` | `oklch(0.94 0.03 265)` — açık mor | Hover/vurgulanan alan arka planı |
| `--destructive` | `oklch(0.577 0.245 27.325)` — kırmızı | Silme butonları, hata durumları |
| `--border` / `--input` | `oklch(0.922 0.005 265)` — çok açık gri-mor | Kenarlıklar, input çerçeveleri |
| `--card` | beyaz (light) / `oklch(0.205 0 0)` (dark) | Kart, dialog arka planı |
| `--radius` | `0.75rem` | Genel köşe yuvarlaklığı (butonlar biraz daha az, büyük kartlar biraz daha fazla yuvarlak — ölçeklenmiş türevler var) |

Koyu temada aynı hue (265, mor-indigo) korunuyor, sadece açıklık/doygunluk değerleri tersine çevriliyor (arka plan koyulaşıyor, primary rengi daha parlak/doygun bir mora dönüyor).

Ayrıca **etiket (tag) renkleri** için 8 sabit renk seçeneği var: gri, kırmızı, turuncu, amber, yeşil, mavi, mor, pembe — her biri bir "nokta" rengi ve soluk bir "rozet" (badge) arka plan/metin rengi çifti olarak tanımlı.

### Bileşen Envanteri (shadcn/ui tabanlı, tüm uygulamada tekrar kullanılan)

Button, Input, Textarea, Label, Select (özel dropdown, native `<select>` değil), Checkbox, Card (Header/Content/Footer alt parçalarıyla), Badge (default/secondary/destructive/outline varyantları), Avatar (baş harfli fallback), Dialog (modal pencere), AlertDialog (onay gerektiren, geri dönüşü olmayan aksiyonlar için ayrı bir modal varyantı), DropdownMenu, Popover, Sheet (kenardan kayan panel — sağdan açılıyor), ScrollArea, Separator, Skeleton, Tabs (kodda tanımlı ama şu an aktif kullanılmıyor), Toggle (editör araç çubuğu butonları için basılı/basılı-değil durumu olan buton).

### Genel Buton Boyutları

`xs`, `sm`, `default`, `icon-xs`, `icon-sm`, `icon` gibi standart boyut varyantları var — küçük ikon-only butonlar (kolon silme çöp kutusu gibi) `icon-xs`, ana aksiyon butonları `sm`/`default`.

---

## 1. Auth Ekranları (Giriş / Kayıt)

**Ortak düzen (Layout):** Tüm ekranı kaplayan, yukarıdan aşağı hafif gradyanlı (`muted` tonundan `background`'a) bir arka plan; dikey ve yatay ortalanmış, maksimum `384px` (`max-w-sm`) genişliğinde bir sütun. Üstte marka logosu: küçük bir ampul ikonu + "Fikir Kuluçkası" yazısı, ikisi de yan yana, ortalı.

### 1.1 Giriş Yap (`/login`)

Tek bir **Card** (kart) bileşeni içinde:
- **Kart başlığı:** "Giriş Yap" (büyük, kalın)
- **Alt açıklama:** "Hesabınıza giriş yapın" (soluk, küçük)
- **Form alanları (dikey sıralı):**
  - E-posta input'u (etiketli: "E-posta")
  - Şifre input'u (etiketli: "Şifre", karakterler gizli)
- **Birincil buton:** "Giriş Yap" — tam genişlik, dolu (primary) renk, submit
- **İkincil buton:** "Google ile devam et" — tam genişlik, outline (çerçeveli, boş) stil, tıklanınca Google OAuth akışını başlatır
- **Alt metin:** "Hesabınız yok mu? **Kayıt olun**" (link kısmı altı çizili)
- Form gönderilirken butonlar devre dışı kalır (pending durumu)
- Hata durumunda ekranın üstünde/yanında bir toast bildirimi çıkar (örn. "Invalid login credentials" → Türkçeleştirilmiş hata mesajı)

### 1.2 Kayıt Ol (`/signup`)

Login ile birebir aynı kart yapısı, farkları:
- Başlık "Kayıt Ol", alt açıklama "Yeni bir hesap oluşturun"
- E-posta/şifre alanlarının **üstüne**, yan yana iki input eklenir: **"Ad"** ve **"Soyad"** (2 sütunlu grid, ikisi de zorunlu)
- Birincil buton metni "Kayıt Ol"
- Alt metin "Zaten hesabınız var mı? **Giriş yapın**"

---

## 2. Workspace Listesi (`/workspaces`)

Uygulamaya giriş yaptıktan sonraki ilk sayfa. Üstte ortak **Header** var (bkz. Bölüm 8). İçerik alanı ortada, maksimum genişlik `1024px` (`max-w-5xl`).

- **Sayfa başlığı:** "Workspace'lerim" (sol üstte, büyük)
- **"Workspace Oluştur" butonu** (sağ üstte, dolu/primary) → bir **Dialog** açar:
  - Başlık: "Yeni Workspace"
  - Açıklama: "Bir başlık girin ve isterseniz bir şablon seçin."
  - **Başlık** input'u (zorunlu, placeholder: "Örn: Q3 Girişim Fikirleri")
  - **Şablon** dropdown/select'i: "Boş board" veya sistemdeki hazır şablonlardan biri seçilir
  - Alt buton: "Oluştur"
- **Workspace kartları grid'i** (1/2/3 sütun, ekran genişliğine göre responsive): her kart bir **Card** bileşeni —
  - Kart başlığında: workspace adının ilk harfini gösteren küçük, yuvarlak köşeli, mor arka planlı bir **rozet/avatar kutusu** + workspace adı (tıklanabilir link, board'a götürür)
  - Kart altında: "Davet kodu: `xxxxxxxxxx`" (küçük, soluk, monospace olmayan ama kod gibi görünen metin) + sağda **"Linki Kopyala"** butonu (küçük, outline) — tıklanınca panoya davet linki kopyalanır ve bir onay toast'ı çıkar
  - Kart hover'da hafif gölge büyür
- **Boş durum** (hiç workspace yoksa): kesikli çerçeveli büyük bir kutu, ortasında yuvarlak mor arka planlı bir "klasör/kanban" ikonu, altında "Henüz bir workspace'iniz yok" başlığı ve kısa açıklama metni

---

## 3. Katılım Sayfası (`/join/[davet-kodu]`)

Kullanıcı görünür bir ekran değil, çoğunlukla **otomatik yönlendirme** noktası: davet linkine tıklanınca giriş yapılmışsa otomatik workspace'e katılır ve board'a yönlendirilir; giriş yapılmamışsa login'e yönlendirir. Sadece katılım **başarısız olursa** görünen bir ekran var:
- Ortalanmış, sade metin: "Katılım Başarısız" başlığı + hata açıklaması (örn. "Bu davet kodu geçersiz")
- Alt buton: "Workspace'lerime dön"

---

## 4. Kanban Board Sayfası (`/workspace/[id]`) — Uygulamanın Ana Ekranı

Bu, uygulamanın en yoğun ve en önemli ekranı. Tam ekran yüksekliğinde (header hariç), dikeyde iki bölgeye ayrılıyor: **üst araç çubuğu** ve **kolonlar alanı**.

### 4.1 Sayfa Üst Şeridi (Board Header Bar)

Yatay, sola-sağa yaslı bir sıra, altında ince bir ayraç çizgisi:

**Sol taraf:**
- **Geri butonu** (sadece ikon, ghost/şeffaf stil, sol ok ikonu) → workspace listesine döner
- **Workspace başlığı** (büyük, kalın metin)

**Sağ taraf** (soldan sağa sıralı butonlar):
- **"Aktivite" butonu** (outline, aktivite/nabız ikonu) → sağdan kayan bir **Sheet panel** açar (bkz. 4.7)
- **"Üyeler" butonu** (outline, kullanıcılar ikonu) → bir **Dialog** açar (bkz. 4.8)
- **"Şablon Olarak Kaydet" butonu** (outline, sadece Kurucu/Yönetici rolündeki kullanıcılara görünür) → küçük bir Dialog açar (şablon adı input'u + "Kaydet")

### 4.2 Arama ve Filtre Çubuğu

Üst şeridin hemen altında, ayrı bir yatay şerit (altında ince ayraç):
- **Arama input'u** (sol tarafta büyüteç ikonlu, placeholder "Fikir ara...", ~256px genişlik) — başlık ve içerik metninde anlık arama yapar
- **Etiket filtresi dropdown'ı** ("Tüm etiketler" varsayılan, workspace'teki etiketler listelenir)
- **Atanan kişi filtresi dropdown'ı** ("Tüm atananlar" varsayılan, "Atanmamış" seçeneği + üye listesi)
- Herhangi bir filtre aktifse: **"Temizle" butonu** belirir (ghost stil, X ikonlu) — tüm filtreleri sıfırlar
- Tüm filtreler **anlık/client-side** çalışır, sayfa yenilenmez

### 4.3 Kolonlar Alanı (Ana Kanban Görünümü)

Yatayda kaydırılabilir (`overflow-x-auto`), kolonlar sabit sırada yan yana dizilir (kolonlar **sürüklenip yeniden sıralanamaz** — bilinçli tasarım kararı). Her kolon sabit `288px` genişliğinde bir kart-benzeri kutu (kenarlıklı, hafif gölgeli, köşeleri yuvarlak).

**Her kolonun içi (yukarıdan aşağıya):**
1. **Kolon başlık satırı:** solda durum rengini gösteren küçük bir **renkli nokta** (Taslak=gri, İncelemede=amber/sarı, Onaylandı=marka rengi, İptal=kırmızı, Tamamlandı=yeşil) + kolon adı; sağda o kolonun **durum rozeti** (Badge, örn. "Taslak") ve (sadece Kurucu/Yönetici'ye görünen) küçük bir **çöp kutusu ikon butonu** → tıklanınca bir **AlertDialog** açılır: kolon boşsa "silmek istediğinize emin misiniz" onayı, doluysa silme engellenip "önce fikirleri taşıyın" uyarısı (bu durumda onay butonu hiç gösterilmez, sadece "Vazgeç")
2. **Kart listesi:** o kolondaki fikir kartları dikey sırayla (bkz. 4.4). Boşsa: soluk bir "kutu/inbox" ikonu + "Bu kolonda fikir yok" metni.
3. **Kolon altı:** (Gözlemci rolü hariç herkese görünen) **"Fikir Ekle" butonu** (ghost, soluk metin, artı ikonu) → yeni fikir oluşturma dialogunu açar (bkz. 4.5)

**Kolonlar şeridinin en sağında:** (sadece Kurucu/Yönetici'ye görünen) kesikli çerçeveli, "Kolon Ekle" yazan büyük bir outline buton → yeni kolon oluşturma dialogunu açar: Başlık input'u + Durum dropdown'ı (Taslak/İncelemede/Onaylandı/İptal/Tamamlandı) + "Ekle" butonu.

**Sürükleme davranışı:** Bir kart bir kolondan diğerine sürüklenip bırakıldığında, kart **anında** (sunucu yanıtı beklenmeden) yeni konumunda görünür; arka planda kayıt başarısız olursa kart otomatik eski yerine döner ve hata toast'ı çıkar. Hedef kolon "İptal" durumundaysa, taşıma öncesi ayrı bir **"İptal Sebebi" dialogu** açılır (Textarea + "Onayla ve Taşı" / "Vazgeç" butonları), sebep girilmeden taşıma tamamlanmaz.

### 4.4 Fikir Kartı (Idea Card)

Kolon içindeki her kart bir **Card** bileşeni (hover'da kenarlık marka rengine döner, hafif gölge belirir), tıklanabilir (tüm kart bir buton gibi davranır, tıklanınca detay penceresi açılır).

**Kart içeriği (yukarıdan aşağıya):**
- **Üst satır:** solda fikir başlığı (tek satıra sığdırılmış, taşarsa "..." ile kesilir) — sağda **oy butonu**: eğer kullanıcı oy verebiliyorsa (Gözlemci değilse) tıklanabilir bir buton (yukarı ok ikonu + oy sayısı; kullanıcı zaten oy vermişse dolu/primary renkte, vermemişse boş/outline), tıklaması karta tıklamayı tetiklemez (ayrı davranır); Gözlemci ise sadece salt-okunur bir rozet olarak görünür
- **İçerik önizlemesi:** fikrin zengin metin içeriğinin kısaltılmış (satır sınırlı) düz metin/HTML önizlemesi, soluk renkte
- **Etiket rozetleri:** varsa, fikre eklenmiş etiketler küçük renkli Badge'ler olarak yan yana
- **Alt satır:** solda iki küçük rozet — "Etki: Orta" ve "Efor: Orta" (Düşük/Orta/Yüksek değerlerinden biri); sağda (biri atanmışsa) atanan kişinin **baş harfli yuvarlak avatarı** (üzerine gelince tam adı tooltip olarak görünür)

### 4.5 Fikir Oluştur / Düzenle Penceresi (Dialog)

Orta boy bir modal pencere (form). Başlık, oluşturma modunda "Yeni Fikir", düzenleme modunda "Fikri Düzenle".

**Form alanları (dikey sıralı):**
1. **Başlık** — tek satır input, zorunlu
2. **İçerik** — tam bir **zengin metin editörü** (Tiptap), üstünde küçük bir araç çubuğu: Kalın, İtalik, Başlık (H2), Madde İşaretli Liste, Numaralı Liste toggle butonları + sağda ayrı duran **"MD İçe Aktar" butonu** (bir `.md` dosyası seçip içeriğini editöre yükler, mevcut yazılanın üzerine yazar)
3. **Problem Tanımı** — çok satırlı metin alanı (Textarea), opsiyonel
4. **Hedef Kitle** — çok satırlı metin alanı, opsiyonel
5. **Etki** ve **Efor** — yan yana iki dropdown (Düşük/Orta/Yüksek), varsayılan "Orta"
6. **Ekler ve Dosyalar** — **sadece oluşturma modunda görünür:** sürükle-bırak alanı (kesikli çerçeve, üstte yükleme ikonu, "Dosyaları buraya sürükleyin veya seçmek için tıklayın" metni, altında "Maks 10MB · Görsel, PDF, DOCX, TXT, MD, ZIP" notu). Dosya seçilince, her biri adı/boyutu ve bir **kaldır (X) butonu** ile listelenen küçük kartlar halinde altta birikir. Bu dosyalar fikir henüz kaydedilmediği için "bekleme" listesinde tutulur; "Oluştur"a basılınca önce fikir oluşturulur, ardından bu dosyalar otomatik yüklenir.
- **Alt buton:** oluşturma modunda "Oluştur", düzenleme modunda "Kaydet"

### 4.6 Fikir Detay Penceresi (Idea Detail Dialog) — En Büyük/En Karmaşık Ekran

Ekranın büyük kısmını kaplayan geniş bir modal (yükseklik `85vh`), **iki sütuna bölünmüş**:

**Üst başlık şeridi** (hafif gri arka planlı, alt çizgili, tüm genişlik boyunca):
- Sol tarafta (üst üste iki satır): fikir başlığı (büyük) + altında yatay bir rozet/kontrol sırası: "Etki: Orta" rozeti, "Efor: Orta" rozeti, **atanan kişi seçici** (küçük bir dropdown, kullanıcı ikonuyla, seçili kişinin adını veya "Atanmadı" gösterir), **Etiketler seçici** (bkz. 4.6.1 — bir Popover açan "Etiketler (N)" butonu)
- Sağ tarafta (üst sağ köşe, dialogun kendi kapatma X'inin solunda), yatay buton sırası:
  - **"Link Kopyala"** (ghost, link ikonu) — bu fikre doğrudan bağlantıyı panoya kopyalar
  - **"Geçmiş"** (ghost, saat/geçmiş ikonu) → Versiyon Geçmişi penceresini açar (bkz. 4.9)
  - **"Düzenle"** (outline, kalem ikonu) — sadece fikri oluşturan kişi veya Kurucu/Yönetici'ye görünür — Bölüm 4.5'teki formu düzenleme modunda açar
  - **"Sil"** (dolu kırmızı/destructive, çöp kutusu ikonu) — aynı yetki koşulu — bir onay AlertDialog'u açar

**Sol sütun (dar, ~280px, ayrı kaydırılabilir, hafif gri arka plan):**
- Üstte küçük başlık: "YORUMLAR" (konuşma balonu ikonlu)
- Altında tam **Yorumlar Paneli** (bkz. 4.6.2)

**Sağ sütun (geniş, ayrı kaydırılabilir):**
- **"Problem Tanımı" bölümü** (varsa) — küçük başlık + düz paragraf metni
- **"Hedef Kitle" bölümü** (varsa) — hedef ikonlu küçük başlık + paragraf
- **"İçerik" bölümü** — kenarlıklı bir kutu içinde, fikrin tam zengin metin içeriğinin salt-okunur render'ı
- **"Ekler ve Dosyalar" bölümü** (bkz. 4.6.3)

#### 4.6.1 Etiket Seçici (Tag Picker)

Bir **Popover** (küçük açılır kutu, tetikleyici buton "Etiketler" + seçili sayı). İçinde:
- Üstte seçili etiketlerin rozet listesi ("henüz etiket seçilmedi" boş durumu)
- Ortada, kaydırılabilir bir liste: workspace'teki tüm etiketler, her biri bir onay kutusu (Checkbox) + renkli nokta + isim ile — işaretleyip kaldırarak fikre etiket ekleme/çıkarma
- Altta ayrı bir bölüm: 8 renk noktasından birini seçme (seçili olan halka ile vurgulanır) + yeni etiket adı input'u + ekle (artı ikon) butonu — workspace'e yepyeni bir etiket tanımlar

#### 4.6.2 Yorumlar Paneli

- **Yorum yazma formu** (Gözlemci hariç herkese görünür): özel bir **"mention" destekli metin alanı** — kullanıcı `@` yazdığı an, imlecin hemen üstünde beliren küçük bir açılır liste (workspace üyeleri, isimle filtrelenebilir, ok tuşlarıyla gezilip Enter/Tab ile seçilebilir) görünür; bir üye seçilince metne `@Ad Soyad` olarak eklenir. Altında sağa yaslı **"Yorum Ekle"** butonu (küçük, dolu).
- **Yorum listesi** (kronolojik, eskiden yeniye): her yorum, solda küçük bir baş-harf avatarı + sağda konuşma balonu şeklinde (üst-sol köşesi keskin) soluk arka planlı bir kutu — içinde yazar adı (kalın, küçük), tarih/saat (soluk, küçük; düzenlenmişse yanında "(düzenlendi)" notu), ve yorum metni.
  - Sadece **kendi yorumunun yazarına** görünen küçük bir **kalem (Düzenle) ikonu** — tıklanınca yorum metni yerine bir Textarea + "Vazgeç"/"Kaydet" butonları belirir (satır-içi düzenleme)
  - Yazara **veya** Kurucu/Yönetici'ye görünen küçük bir **çöp kutusu (Sil) ikonu** — onay AlertDialog'u açar
- **"Daha Fazla Yükle" butonu** (outline, tam genişlik değil, sadece daha fazla yorum varsa görünür) — sayfalama

#### 4.6.3 Ekler ve Dosyalar Bölümü

- Başlık: ataç ikonlu "Ekler ve Dosyalar"
- (Katkı sağlayabilen kullanıcılara) sürükle-bırak yükleme alanı (4.5'teki ile aynı görsel dil)
- Dosya listesi: her dosya bir satır — solda dosya tipine göre değişen bir ikon (görsel/PDF-Word-metin/ZIP/genel dosya), ortada dosya adı (tıklanabilir link, yeni sekmede açar) + altında küçük meta bilgi ("boyut · yükleyen kişi adı · tarih"), sağda **"İndir" ikon butonu** ve (yükleyen kişi veya Kurucu/Yönetici'ye görünen) **"Sil" ikon butonu**

### 4.7 Aktivite Akışı Paneli (Sheet — sağdan kayan panel)

- Panel başlığı: "Aktivite Akışı"
- Kronolojik liste (en yeni üstte): her satır bir aktivite cümlesi ("Ayşe, 'X' fikrini oluşturdu" gibi düz metin) + altında tarih/saat, satırlar arası ince ayraç çizgisi
- Altta "Daha Fazla Yükle" butonu (varsa)
- Panel açıkken yeni bir aktivite olursa listenin en üstüne **anında** eklenir

### 4.8 Üyeler Penceresi (Dialog)

- Başlık: "Workspace Üyeleri"
- Alt açıklama: "Davet kodu: `xxxxxxxxxx`" (monospace görünümlü)
- **Üye listesi:** her satır — solda baş-harf avatarı + ad/soyad (üstte) + e-posta (altta, soluk, küçük); Kurucu ise yanında taç ikonlu bir "Kurucu" rozeti. Kurucu olmayan her satırın sağında:
  - Rol seçici **dropdown** (Üye/Yönetici/Gözlemci) — sadece Kurucu/Yönetici görebilir ve değiştirebilir; diğerlerine düz bir rozet olarak görünür
  - (Sadece Kurucu'ya, kendisi hariç herkes için) **"Sahipliği Devret"** metin butonu (ghost, çok küçük)
  - (Kurucu/Yönetici'ye, kendileri hariç) küçük bir **çöp kutusu ikon butonu** — üyeyi çıkarır
- **Alt bölüm (sadece Kurucu'ya görünen, ayraçla ayrılmış "Workspace Ayarları"):**
  - Ayar ikonlu küçük başlık
  - "Davetle katılanların varsayılan rolü" etiketi + yanında rol dropdown'ı (Üye/Yönetici/Gözlemci)
  - **"Davet Kodunu Yenile"** butonu (outline, döngü ikonu)
  - **"Workspace'i Sil"** butonu (dolu kırmızı/destructive, çöp kutusu ikonu) → çift onaylı bir AlertDialog ("Bu işlem geri alınamaz..." uyarısı + "Kalıcı Olarak Sil" onay butonu)

### 4.9 Versiyon Geçmişi Penceresi (Dialog)

Geniş bir modal (`80vh` yükseklik). Başlık "Versiyon Geçmişi" + açıklama.

- İçerik **yatayda kaydırılabilir bir kart dizisi**: en yeni versiyon solda, geriye doğru sağa doğru sıralanır, her ikisi arasında ince bir bağlantı çizgisi
- Her versiyon kartı (~320px genişlik, dikey dolu yükseklik):
  - Üstte "v3" gibi bir versiyon numarası rozeti (en yenisi dolu/primary renkte + yanında ayrıca "Güncel" rozeti)
  - Yazarın adı + tarih/saat (küçük, soluk)
  - Bir önceki versiyona göre **hangi alanların değiştiğini** gösteren küçük rozetler ("Başlık değişti", "İçerik değişti" vb.)
  - Fikir başlığı (kalın, 2 satırla sınırlı)
  - Kaydırılabilir küçük bir kutu içinde o versiyondaki içeriğin önizlemesi
  - Altta "Etki: ..." / "Efor: ..." rozetleri

---

## 5. Ortak/Genel Bileşenler (Her Sayfada veya Birden Fazla Yerde Görünen)

### 5.1 Üst Header (tüm oturum-içi sayfalarda sabit, üstte yapışkan)

Sabit yükseklikte (~56px), hafif saydam/bulanık (backdrop-blur) arka plan, alt çizgi.

- **Sol:** logo — küçük ampul ikonu + "Fikir Kuluçkası" yazısı (link, tıklanınca `/workspaces`'e döner)
- **Sağ:** o sayfaya özgü ekstra butonlar (varsa, örn. bildirim zili) + her zaman en sağda **kullanıcı menüsü**:
  - Yuvarlak, çerçeveli bir avatar butonu (kullanıcının baş harfleri) → tıklanınca bir **DropdownMenu** açılır:
    - Üstte (tıklanamaz) kullanıcı adı (kalın) + e-postası (soluk, küçük)
    - Ayraç
    - **"Ayarlar"** menü öğesi → bir Dialog açar (bkz. 5.4)
    - **"Çıkış Yap"** menü öğesi

### 5.2 Bildirim Zili (Header'da, sadece workspace-içi ekranlarda)

- Yuvarlak, çerçeveli ikon buton (zil ikonu); okunmamış bildirim varsa sağ üst köşesinde küçük kırmızı sayaç rozeti (9'dan fazlaysa "9+")
- Tıklanınca açılan **DropdownMenu** (geniş, ~320px):
  - Üstte "Bildirimler" başlığı + (okunmamış varsa) sağda küçük "Tümünü okundu yap" metin butonu
  - Liste: her bildirim satırı — mesaj metni (küçük) + altında tarih/saat (daha küçük, soluk); okunmuş olanlar soluklaştırılmış görünür; bir satıra tıklamak onu okunmuş işaretler
  - Boşsa: "Bildirim yok" metni
  - Altta (varsa) "Daha fazla yükle" satırı
- Yeni bir bildirim geldiğinde zil **anında** güncellenir (sayfa yenilenmeden)

### 5.3 Undo (Geri Al) Toast'ı — Uygulama Genelinde Tekrar Eden Kritik Kalıp

Fikir/yorum/dosya **silme** işlemlerinin **hepsinde** birebir aynı görsel kalıp kullanılıyor:
1. Silme onaylanır onaylanmaz, öğe ekrandan **anında** kaybolur.
2. Ekranın **alt-orta** noktasında, "X silindi." yazan + sağında **"Geri Al"** metin butonu olan küçük bir toast belirir.
3. Bu toast **30 saniye** ekranda kalır, sonra kendiliğinden kaybolur.
4. "Geri Al"a basılırsa öğe olduğu yere/sırayla geri döner.

Bu üç yerde (fikir, yorum, dosya) tasarımsal olarak **tamamen özdeş** olmalı — sadece mesaj metni değişiyor.

### 5.4 Ayarlar Penceresi (Dialog, küçük)

- Başlık "Ayarlar" + kısa açıklama
- Tek bir satır: sol tarafta bir **Checkbox**, sağında iki satırlık etiket — kalın "E-posta Bildirimlerini Aktif Et" + altında soluk açıklama cümlesi. Tüm satır çerçeveli, hafif dolgulu bir kutu (tıklanabilir alan checkbox ile birlikte tüm satırı kapsar).

---

## 6. Durum (State) Varyasyonları — Tasarımda Ayrıca Düşünülmesi Gerekenler

- **Boş durumlar:** workspace listesi boşken, kolon boşken, yorum/dosya/bildirim/aktivite listesi boşken — her biri kısa, soluk renkli, çoğunlukla bir ikon eşliğinde bir mesaj gösteriyor.
- **Yüklenme durumları:** "Yükleniyor..." metni (spinner yok, düz metin) — üyeler, yorumlar, aktivite, dosyalar, versiyon geçmişi ilk açıldığında.
- **Pending/işlem-sürüyor durumları:** form gönderilirken butonlar disabled olur (metin değişmez, sadece tıklanamaz hale gelir).
- **Rol bazlı görünürlük:** Aynı ekranın **Kurucu**, **Yönetici**, **Üye**, **Gözlemci** rolüne göre farklı görünmesi gerekiyor — bazı butonlar (Kolon Ekle, Kolon Sil, Şablon Kaydet, Üye rolü değiştirme, Workspace Sil) tamamen gizleniyor; Gözlemci için ayrıca sürükle-bırak, oy verme, yorum yazma, dosya yükleme formları da gizleniyor (salt-okunur rozet/metin olarak kalıyor).
- **Hover durumları:** kartlarda kenarlık rengi + gölge artışı; butonlarda arka plan/kenarlık koyulaşması (standart shadcn davranışı).
- **Sürükleme durumu:** bir kart sürüklenirken bırakılacağı kolon gövdesi hafif vurgulanır (arka plan rengi değişir).

---

## 7. Sayfa/Ekran Haritası (Özet)

| Rota | Ekran | Ana Bileşen(ler) |
|---|---|---|
| `/login` | Giriş | AuthForm (Card) |
| `/signup` | Kayıt | AuthForm (Card) |
| `/workspaces` | Workspace listesi | Kart grid + Oluşturma Dialog'u |
| `/join/[kod]` | Katılım (çoğunlukla redirect) | Hata durumu ekranı |
| `/workspace/[id]` | **Kanban Board** (ana ekran) | Header bar, arama/filtre, kolonlar, kartlar + iç içe **8 farklı dialog/panel** (fikir oluştur/düzenle, fikir detay, versiyon geçmişi, üyeler, aktivite sheet, kolon oluştur, iptal sebebi, şablon kaydet, ayarlar) |

---

Bu doküman, uygulamanın **bugünkü** (mevcut/eski) tasarımını değil, **hangi ekranların, hangi bileşenlerin, hangi davranışlarla var olduğunu** anlatır — amaç bu envanteri temel alarak sıfırdan/yeniden bir görsel tasarım üretmektir.
