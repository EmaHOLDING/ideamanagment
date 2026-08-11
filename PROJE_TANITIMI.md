# Fikir Kuluçkası — Proje Tanıtımı

Bu belge, **Fikir Kuluçkası** uygulamasının bugün itibarıyla sahip olduğu tüm özellikleri, teknik bilgi gerektirmeden, sade bir dille anlatır. Amaç; ürünü baştan sona tanımak, nelerin zaten var olduğunu görmek ve bundan sonraki geliştirme kararlarını bu bütün resme bakarak vermektir.

---

## 1. Uygulama Ne İşe Yarıyor?

Fikir Kuluçkası, bir ekibin girişim/ürün fikirlerini birlikte üretip olgunlaştırdığı bir **Kanban panosu** uygulaması. Her fikir bir kart olarak panoda yaşıyor; kartlar "Taslak", "Değerlendirmede", "Onaylandı" gibi kolonlar arasında sürüklenerek ilerliyor. Ekip üyeleri fikirleri birlikte yazıp düzenleyebiliyor, yorum yapabiliyor, oy verebiliyor, dosya ekleyebiliyor ve tüm bu süreç gerçek zamanlı olarak herkesin ekranına yansıyor.

---

## 2. Hesap ve Giriş

- **Uygulamanın kendi e-posta/şifreli kayıt sistemi kaldırıldı.** Hesap oluşturma ve giriş artık sadece dış hesap sağlayıcılarıyla yapılıyor: **Google, Microsoft/Entra ID (Office 365), LinkedIn, GitHub, GitLab**. Giriş ekranında bu beş sağlayıcı için ayrı birer "... ile devam et" butonu var.
- İsim/soyisim ayrıca sorulmuyor — seçilen sağlayıcıdaki ad bilgisi otomatik olarak alınıp uygulamanın hiçbir yerinde çıplak e-posta adresleri değil, gerçek isimler görünecek şekilde kullanılıyor.
- Giriş yapmamış bir kullanıcı hiçbir sayfaya erişemiyor, otomatik olarak giriş ekranına yönlendiriliyor.

## 3. Workspace'ler (Çalışma Alanları)

Her ekip/proje kendi **workspace**'inde çalışıyor:

- Kullanıcı istediği kadar workspace oluşturabiliyor, her birine ayrı bir davet kodu üretiliyor. Oluştururken isteğe bağlı olarak en fazla **250 karakterlik bir açıklama** da girilebiliyor — bu açıklama hem workspace listesindeki kartın altında hem de Workspace Ayarları'nın Genel bölümünde görünüyor ve sonradan düzenlenebiliyor.
- Bir davet linkine/koduna tıklayan kişi artık **doğrudan panoya girmiyor**: workspace, kendi workspace listesinde "Bekleyen Davetler" bölümünde beliriyor; orada kaç kişinin zaten üye olduğunu ve kendisine hangi rolün atanacağını görüp **"Kabul Et"** veya **"Reddet"** diyor. Kabul edilmeden panonun içeriğine (kolonlar, fikirler) erişilemiyor; zaten aktif bir üye kendi davet linkine tekrar tıklarsa bu adım atlanıp doğrudan panoya gidiyor.
- Davet linkini paylaşmanın yanı sıra, Workspace Ayarları'ndan doğrudan bir **e-posta adresine davet gönderilebiliyor** (Kurucu/Yönetici) — davet edilen kişiye, tıklandığında davet sayfasına götüren bağlantı içeren bir e-posta gidiyor.
- Workspace'i oluşturan kişi **Kurucu (Owner)** oluyor; workspace'i tamamen silme veya sahipliği başka birine devretme yetkisi sadece ona ait.
- **Davet kodu** istenildiğinde yenilenebiliyor (eski link geçersiz olur, önceki üyeler etkilenmez).
- Boş bir pano ile başlamak yerine, hazır **şablonlardan** (örn. "Basit Kanban", "İptal Takipli Kanban") biri seçilerek workspace kurulabiliyor. Ayrıca mevcut bir panonun kolon yapısı yeni bir şablon olarak da kaydedilebiliyor.

### Roller ve Yetkiler

Her workspace üyesinin dört rolden biri var, yetkiler buna göre kademeleniyor:

| Rol | Ne yapabilir |
|---|---|
| **Kurucu (Owner)** | Her şeyi yapabilir; ayrıca workspace'i silebilir ve sahipliği devredebilir. |
| **Yönetici (Admin)** | Kolon ekleyip silebilir, üyelerin rolünü değiştirebilir, herkesin fikrini/yorumunu silebilir — ama workspace'i silemez, sahipliği devredemez. |
| **Üye (Member)** | Fikir/yorum ekleyebilir, oy verebilir, dosya yükleyebilir; ama sadece **kendi** oluşturduğu fikri/yorumu düzenleyip silebilir. |
| **Gözlemci (Viewer)** | Sadece izler — hiçbir şey ekleyemez, değiştiremez, silemez. |

- Yeni bir kişi davet linkiyle katıldığında hangi rolle başlayacağı, Kurucu tarafından "Workspace Ayarları" bölümünden önceden belirlenebiliyor (varsayılan olarak Üye).
- Bir yorumu **düzenleme** yetkisi özel bir kuralla korunuyor: Kurucu veya Yönetici bile olsa, başkasının yorumunun içeriğini değiştiremiyor — sadece yazarı düzenleyebiliyor. (Silme farklı: Kurucu/Yönetici gerekirse başkasının yorumunu da silebiliyor.)

### Workspace Ayarları

Kurucu ve Yönetici'nin erişebildiği, sol menüde kategorilere ayrılmış ayrı bir ayarlar sayfası var:

- **Genel:** workspace adı ve açıklaması düzenlenir, oluşturulma tarihi görünür.
- **Üyeler:** üye listesi, rol değiştirme, üye çıkarma, sahipliği devretme.
- **Kolonlar:** mevcut kolonlar burada **sürüklenerek yeniden sıralanabiliyor** ve adları değiştirilebiliyor; ayrıca mevcut kolon yapısı yeni bir şablon olarak kaydedilebiliyor.
- **Etiketler:** workspace'in ortak etiket havuzu tamamen buradan yönetiliyor — yeni etiket oluşturma, ad/renk düzenleme, silme. (Fikir detayındaki etiket seçici artık sadece var olan etiketleri fikre ilişkilendiriyor, oradan yeni etiket oluşturulamıyor.)
- **Davet:** davet kodu/linki, e-posta ile davet gönderme, davetle katılanların varsayılan rolü.
- **Tehlikeli Alan:** workspace'i kalıcı olarak silme (sadece Kurucu).

## 4. Kanban Panosu

- Panonun kendisinde kolonlar sabit sırada durur (kafa karışıklığını önlemek için bilinçli bir tasarım tercihi); kolon sırası değiştirilmek istendiğinde Workspace Ayarları'nın Kolonlar sekmesinden sürüklenerek yeniden sıralanabiliyor. Fikir **kartları** ise doğrudan panoda kolonlar arasında serbestçe sürüklenip bırakılabiliyor.
- Bir kart "İptal Edildi" türündeki bir kolona taşınmak istendiğinde, sistem taşımadan önce bir **iptal sebebi** girilmesini zorunlu kılıyor.
- Kart bir kolondan diğerine sürüklenip bırakıldığı an, sunucu cevabı beklenmeden **anında** yeni yerinde görünür hale geliyor (arka planda kayıt işlemi devam eder; bir hata olursa kart otomatik eski yerine döner).
- **Arama ve filtreleme:** başlık/içerik metnine göre arama, etikete göre filtre, atanan kişiye göre filtre — hepsi anlık ve pano üstünde.
- Kolon Yönetimi (kolon ekleme/silme) sadece Kurucu ve Yönetici'de; içi dolu bir kolon yanlışlıkla silinemiyor (önce fikirlerin taşınması gerekiyor).

## 5. Fikirler

- Her fikrin başlığı, zengin metin biçimli (kalın, başlık, liste vb.) bir **içerik** alanı, isteğe bağlı **problem tanımı**, **hedef kitle**, ve "Düşük/Orta/Yüksek" ölçeğinde **Etki** ve **Efor** puanları var.
- İçerik alanına elle yazmanın yanı sıra hazır bir **.md (Markdown) dosyası içe aktarılabiliyor** — dışarıda hazırlanmış bir metin doğrudan editöre yüklenebiliyor.
- Bir fikir her düzenlendiğinde eski hali kaybolmuyor; sistem otomatik olarak bir **versiyon geçmişi** tutuyor. Geçmiş ekranında hangi versiyonda hangi alanların değiştiği işaretli şekilde, en yeniden en eskiye doğru listeleniyor.
- Her fikre, workspace içindeki üyelerden biri **atanabiliyor** (sorumlu kişi).
- Fikirlere workspace'in ortak **etiket** havuzundan (renkli, tekrar kullanılabilir etiketler) istenilen kadar etiket eklenebiliyor — yeni etiket oluşturma Workspace Ayarları'nın Etiketler sekmesinden yapılıyor, fikir detayındaki seçici sadece var olan etiketleri ilişkilendiriyor.
- Bir fikre **doğrudan link** ile ulaşılabiliyor — "Link Kopyala" ile alınan adres paylaşıldığında, açan kişi otomatik olarak o fikrin detay penceresini açık bulur.
- **Oylama:** her üye bir fikre oy verip geri çekebiliyor (aynı kişi ikinci kez oy vermiyor, oyu bir daha tıklayınca geri alınıyor). Kart üzerinde oy sayısı **"X/Y"** formatında gösteriliyor — kaç üyeden kaçının oy verdiği tek bakışta görülüyor. Oylama panodaki kart sırasını otomatik değiştirmiyor — sadece bir öncelik göstergesi.

## 6. Yorumlar

- Her fikrin kendi yorum akışı var; yorumlar sayfalanarak ("Daha Fazla Yükle") listeleniyor.
- Yorum yazarken **`@` yazıp bir üyenin adını seçerek etiketleme** yapılabiliyor — etiketlenen kişiye bildirim gidiyor.
- Bir yorumu sadece kendi yazarı düzenleyebiliyor; silme yetkisi hem yazarında hem Kurucu/Yönetici'de.

## 7. Bildirimler

- Ekranın üst köşesindeki zil ikonu, okunmamış bildirim sayısını gösteriyor.
- Şu durumlarda bildirim geliyor: fikrinize/daha önce yorum yaptığınız bir fikre yeni yorum gelmesi, bir kartın taşınması, size bir fikrin atanması, bir yorumda `@` ile etiketlenme.
- Yeni bir bildirim geldiğinde zil **anında** (sayfa yenilenmeden) güncelleniyor.
- Bir bildirime **tıklandığında**, kullanıcı otomatik olarak ilgili fikrin bulunduğu workspace'e ve o fikrin detay penceresine yönlendiriliyor — sayfa yenilemeye gerek kalmadan, bildirimi görüp ayrıca panoda o fikri aramaya gerek olmuyor.
- Bildirimler tek tek veya "Tümünü okundu yap" ile toplu olarak okunmuş sayılabiliyor.
- Uygulama içi bildirimlere ek olarak, belirli durumlarda **e-posta** de gönderiliyor — detayları Bölüm 12'de.

## 8. Aktivite Akışı

- Her workspace'in yan panelden açılabilen bir **aktivite akışı** var: "Ayşe, 'X' fikrini oluşturdu", "Mehmet, 'Y' fikrine oy verdi" gibi, kim-ne-yaptı kaydı kronolojik olarak listeleniyor.
- Panel açıkken yeni bir aktivite olduğu an, listenin en üstüne **anında** ekleniyor.

## 9. Ekler ve Dosyalar

Fikirlere dosya eklenebiliyor — görseller, PDF, Word (DOCX), metin (TXT/MD) ve ZIP dosyaları destekleniyor, dosya başına en fazla 10 MB.

- Dosyalar hem fikrin **detay penceresinden** hem de **yeni fikir oluşturma formundan** eklenebiliyor. Oluşturma formunda seçilen dosyalar, fikir henüz kaydedilmediği için önce bekletiliyor; "Oluştur" butonuna basıldığında önce fikir kaydediliyor, hemen ardından bekleyen dosyalar otomatik olarak o fikre yükleniyor.
- Sürükle-bırak ile veya dosya seçici ile yükleme yapılabiliyor.
- Yüklenen her dosyanın adı, boyutu, kimin ne zaman yüklediği görünüyor; bir indirme linki ile dosya indirilebiliyor.
- Bir dosyayı sadece onu yükleyen kişi veya Kurucu/Yönetici silebiliyor.
- Dosya silme davranışı, aşağıda anlatılan **"Sil ve Geri Al" mekanizmasıyla** birebir aynı şekilde çalışıyor.

## 10. "Sil ve Geri Al" Mekanizması (Undo Toast)

Uygulamadaki **fikir, yorum ve dosya silme** işlemlerinin hepsi aynı, kullanıcı dostu deseni izliyor — amaç, yanlışlıkla silinen bir şeyin anında ve kolayca geri getirilebilmesi:

1. Kullanıcı çöp kutusu ikonuna tıklayınca önce bir **onay penceresi** çıkıyor ("Bu içeriği silmek istediğinize emin misiniz?").
2. "Evet, Sil" denildiği an, öğe ekrandan **anında** kayboluyor — herhangi bir bekleme yok, tepki anlık.
3. Ekranın **alt ortasında**, "Fikir silindi." / "Yorum silindi." / "Dosya silindi." yazan ve içinde bir **"Geri Al"** butonu bulunan küçük bir bildirim (toast) beliriyor. Bu bildirim **30 saniye** boyunca ekranda kalıyor.
4. Bu 30 saniye içinde **"Geri Al"a** basılırsa, silinen öğe olduğu yere, olduğu sırayla geri geliyor — sanki hiç silinmemiş gibi.
5. 30 saniye dolup bildirim kendiliğinden kapanırsa, o zaman silme işlemi **kalıcı** hale geliyor.

Bunun arkasındaki mantık şöyle: bir şey "sil" denildiği anda veritabanından tamamen yok edilmiyor, önce sadece **"silinmiş" olarak işaretleniyor** (bu yüzden standart listelerde artık görünmüyor ama veri hâlâ duruyor). 30 saniyelik pencere kapanana kadar "Geri Al" bu işareti kaldırıp veriyi eski haline getirebiliyor. Süre dolduktan sonra ise sistem araya girip veriyi **gerçekten ve kalıcı olarak** temizliyor — dosyalarda bu, hem veritabanı kaydının hem de dosyanın kendisinin sunucudan tamamen silinmesi anlamına geliyor.

Bu mekanizma şu an üç yerde birebir aynı şekilde çalışıyor: **fikir silme**, **yorum silme**, **dosya silme**.

## 11. Gerçek Zamanlı İşbirliği (Realtime)

Aynı workspace'i aynı anda birden fazla kişi açtığında, birinin yaptığı değişiklik **diğerlerinin ekranında sayfa yenilemeye gerek kalmadan anında** görünüyor. Şu an canlı olarak senkronize olan alanlar:

- Panodaki fikirler (yeni fikir, taşıma, silme/geri alma)
- Oylar
- Yorumlar (bir fikrin detay penceresi açıkken)
- Bildirim zili
- Aktivite akışı (panel açıkken)
- Workspace üyeleri (rol değişikliği, katılma, çıkarılma — Workspace Ayarları'nın Üyeler sekmesi açıkken)
- Kolonlar (ekleme/silme)
- Etiketler (yeni etiket oluşturma)

Henüz gerçek zamanlı **olmayan** tek şey: bir dosyayı kimin şu an incelediğini veya bir fikri kimin düzenlemekte olduğunu gösteren bir "eşzamanlı düzenleme" göstergesi (örn. "Ayşe şu an bunu düzenliyor" gibi bir ibare) — bu, ayrı bir teknik altyapı gerektirdiği için henüz eklenmedi.

## 12. Akıllı E-Posta Bildirimleri

Uygulama içi bildirim zili, ancak kullanıcı uygulamayı **açık tutuyorsa** işe yarıyor. Uygulamayı kapatıp giden bir kullanıcıya bir şey ulaşması gerekiyorsa, sistem devreye girip **e-posta** gönderiyor — ama bunu her bildirimde değil, çok kontrollü bir şekilde yapıyor.

**Ne zaman e-posta gider?**

- Sadece iki durumda: biri sizi bir **yorumda `@` ile etiketlediğinde**, veya size bir **fikir atandığında**.
- Kart taşıma, genel (etiketsiz) yorum, oylama gibi diğer olaylar için **hiçbir zaman** e-posta gitmiyor — bunlar sadece zil bildirimi olarak kalıyor.

**"Çevrimiçi misiniz?" nasıl anlaşılıyor?**

Uygulama arka planda, sekmeniz açıkken düzenli aralıklarla sessizce "hâlâ buradayım" sinyali gönderiyor. Bu sinyalin üzerinden birkaç dakikadan fazla geçmişse, sistem sizi "çevrimdışı" kabul ediyor. Mantık basit: **siz uygulamadaysanız e-posta atılmıyor** (zaten zili görüyorsunuzdur), **uygulamada değilseniz** ve olay mention/atama ise e-posta gidiyor.

**Karar sırası tam olarak şöyle işliyor:**

1. Kullanıcı, Ayarlar'dan e-posta bildirimlerini kapatmışsa → **hiçbir zaman** gönderilmiyor (diğer her şeyden önce bu kontrol ediliyor).
2. Kullanıcı o an uygulamada aktifse → gönderilmiyor, sadece zil bildirimi kalıyor.
3. Olay mention veya atama ise ve kullanıcı çevrimdışıysa → e-posta gönderiliyor.
4. Bunların hiçbiri değilse → gönderilmiyor.

**Kullanıcı kontrolü:** Sağ üstteki kullanıcı menüsünden "Ayarlar" açılıp **"E-posta Bildirimlerini Aktif Et"** anahtarıyla bu özellik tamamen kapatılabiliyor (varsayılan olarak açık). Kapatıldığında, kullanıcı ne kadar süre çevrimdışı kalırsa kalsın hiçbir e-posta gönderilmiyor.

**Gönderim altyapısı:** E-postalar [Resend](https://resend.com) servisi üzerinden, uygulamanın marka renklerine uygun sade bir HTML şablonla gidiyor; e-posta içindeki bağlantıya tıklanınca doğrudan ilgili fikrin detay penceresi açılıyor (Bölüm 5'teki "Link Kopyala" ile aynı adres yapısı). Aylık gönderim kotasının gereksiz yere tüketilmemesi için sistem, yukarıdaki üç kontrolü (tercih → çevrimiçilik → tetikleyici türü) geçmeyen hiçbir olayda e-posta göndermiyor.

## 13. Mobil ve Responsive Tasarım

- Workspace listesi, kanban panosu ve fikir detay penceresi mobil ekran genişliklerinde de düzgün çalışacak şekilde düzenlendi (workspace kartlarındaki metin dikey eksende ortalanması dahil).
- Fikir detay penceresinde, asıl içeriğe (problem tanımı, hedef kitle, içerik) daha fazla yer açmak için **yorumlar paneli açılır/kapanır** hale getirildi — masaüstünde varsayılan olarak açık geliyor, mobilde varsayılan olarak kapalı geliyor ve dilenirse tıklanıp açılabiliyor.
- Mobilde, fikir detayının üst kısmındaki aksiyon butonları (Link Kopyala, Geçmiş, Düzenle, Sil) daralıp ikona dönüşüyor; en fazla iki satır kaplayacak şekilde düzenlendi.

---

## Özet: Şu An Neler Var, Neler Yok?

**Var olanlar:** hesap/rol yönetimi, kategorilere ayrılmış Workspace Ayarları sayfası (Genel/Üyeler/Kolonlar/Etiketler/Davet/Tehlikeli Alan), açıklama alanı olan ve e-posta ile davet + kabul/reddet onayıyla katılınan workspace'ler, şablonlu workspace kurulumu, tam donanımlı Kanban panosu (ayarlardan sürükle-sırala kolonlar dahil), versiyonlu fikir yazımı (Markdown içe aktarma dahil), oylama ("X/Y" gösterimi), merkezi etiket yönetimi, atama, doğrudan link paylaşımı, mention'lı yorumlar, bildirimler (uygulama içi zil + tek tıkla ilgili fikre gitme + akıllı e-posta), aktivite akışı, dosya ekleme, uçtan uca "sil → 30 saniye geri al → kalıcı sil" deseni, geniş kapsamlı gerçek zamanlı senkronizasyon ve mobil uyumlu tasarım.

**Henüz olmayanlar (ileride düşünülebilir):** eşzamanlı düzenleme/kimin-baktığı göstergesi (presence göstergesi kullanıcıya görünür değil, sadece e-posta kararı için arka planda kullanılıyor), mobil uygulama, dosya önizleme (şu an sadece indirme var), gelişmiş raporlama/analitik panosu.
