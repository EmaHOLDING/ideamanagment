# Canlıya Alma Rehberi — Google OAuth + Vercel Deploy

Bu rehber, projeyi yerel geliştirme ortamından production'a (Vercel + Supabase Cloud) taşırken izlenecek adımları anlatır. PROJECT.md Bölüm 7'deki genel plan burada somut, sırayla uygulanabilir adımlara dönüştürülmüştür.

> ⚠️ **Güvenlik notu:** Bu dosyaya veya herhangi bir git commit'ine gerçek `GOOGLE_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` gibi değerleri **asla yazmayın**. Bu değerler yalnızca `.env.local` (gitignore'da) ve Vercel Dashboard'un ortam değişkeni ayarlarında bulunmalı.

---

## 0. Ortam Değişkenleri Nereye Yazılır? (En Çok Kafa Karıştıran Kısım)

Bu projede **üç ayrı yer** var, hangisinin ne işe yaradığını netleştirelim — çünkü hiçbiri diğerini otomatik beslemiyor, hepsini **elle** dolduracaksınız:

| Yer | Ne için kullanılır | Nasıl dolduruluyor |
|---|---|---|
| **`.env.local`** (proje kökünde, zaten var) | Next.js uygulamasını **kendi bilgisayarınızda** (`npm run dev`) çalıştırırken kullanılır. | Zaten yerel Supabase (`http://127.0.0.1:54321`) değerleriyle dolu. Google ile giriş'i yerelde de test etmek istiyorsanız `GOOGLE_CLIENT_ID`/`SECRET` satırlarını burada da doldurabilirsiniz (siz zaten doldurmuşsunuz). |
| **Vercel Dashboard → Environment Variables** | Uygulama **canlıda** (`https://...vercel.app` veya kendi domaininiz) çalışırken kullanılır. | Bir **dosya değil**, Vercel'in web arayüzünden tek tek girilir (aşağıda Adım 5.2). |
| **Supabase CLI'nin kendi login/link mekanizması** | `npx supabase db push` gibi komutların **hangi Supabase hesabına ve hangi projeye** migration göndereceğini bilmesi için. | `.env.local`'deki hiçbir şeyi okumaz! Aşağıdaki Adım 2'deki `supabase login` + `supabase link` komutlarıyla ayrıca kurulur. |

**Önemli:** `.env` diye yeni bir dosya oluşturmanıza **gerek yok**. Ne yerel çalıştırma (`.env.local`), ne canlıya alma (Vercel Dashboard), ne de migration gönderme (`supabase login`/`link`) `.env` adında bir dosya beklemiyor. Aşağıdaki adımları sırayla takip edin, hangi adımda hangi değeri nereye gireceğiniz net olacak.

---

## 1. Supabase Production Projesi Oluşturma

1. [supabase.com](https://supabase.com) → **New Project**.
2. Proje adı, güçlü bir veritabanı şifresi ve bölge (region) seçin — kullanıcılarınıza yakın bir bölge (örn. Frankfurt/eu-central) gecikmeyi azaltır.
3. Proje oluşturulduktan sonra **Project Settings → General**'den **Project Reference ID**'yi (`<project-ref>`) not alın — aşağıdaki adımlarda tekrar kullanılacak.
4. **Project Settings → API**'den şu değerleri not alın:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**gizli**, asla client'a sızdırılmaz)

## 2. Yerel Migration'ları Production'a Uygulama

Bu adımda proje köküne (`C:\Users\ensak\Documents\PROJECTS\EmaIdeaManagment`) `cd` ile girmiş olmalısınız. Her komutu **tek tek, bir öncekinin çıktısını gördükten sonra** çalıştırın — hepsi etkileşimli (terminalde soru sorup cevap bekliyorlar).

### 2.1 Supabase CLI ile giriş yapın (bir kereye mahsus)

```bash
npx supabase login
```

Bu komut tarayıcıda bir Supabase yetkilendirme sayfası açar. Giriş yapıp **Authorize**'a bastığınızda terminale otomatik döner ve bir erişim token'ı **CLI'nin kendi ayar dosyasına** kaydeder (proje içine, `.env`'e falan yazmaz — bilgisayarınıza özel, kalıcıdır, bir daha yapmanıza gerek kalmaz).

> Terminalde tarayıcı açılmazsa, verdiği linki elle tarayıcıya yapıştırın.

### 2.2 Projeyi Supabase Cloud'daki gerçek projeye bağlayın (link)

```bash
npx supabase link --project-ref <project-ref>
```

- `<project-ref>` = Adım 1.3'te not aldığınız Project Reference ID (örn. `abcdefghijklmnop` gibi 20 karakterlik bir kod, Supabase Dashboard → Project Settings → General'de görünür).
- Komut size **veritabanı şifresini** soracak — bu, Adım 1.2'de yeni proje oluştururken belirlediğiniz şifre (Supabase hesap şifreniz **değil**).
- Şifreyi unuttuysanız: Dashboard → **Project Settings → Database → Reset Database Password** ile sıfırlayabilirsiniz.
- Başarılı olursa proje kökünde `supabase/.temp/` altına bağlantı bilgisi yazılır (bu klasör zaten `.gitignore`'da).

### 2.3 Migration'ları gönderin

```bash
npx supabase db push
```

(Artık `link` yapıldığı için `--linked` yazmanıza gerek yok, ama yazarsanız da sorun olmaz.)

Bu komut, `supabase/migrations/` klasöründeki **tüm** `.sql` dosyalarını (şema, RLS politikaları, RPC fonksiyonları, grant'lar — hepsi) tarih sırasına göre production veritabanına uygular. Hangi migration'ların uygulanacağını göstererek **onay** ister; `y` yazıp Enter'a basın.

### 2.4 Sistem şablonlarını (seed) yükleyin

`db push` seed dosyasını **otomatik çalıştırmaz** (seed sadece yerelde `db reset` ile otomatik yüklenir). Production'da elle yapılması gerekir:

1. Supabase Dashboard → projenizi açın → sol menüden **SQL Editor**.
2. **New query**.
3. Bilgisayarınızdaki `supabase/seed.sql` dosyasının **tüm içeriğini** kopyalayıp editöre yapıştırın.
4. **Run**'a basın.

### 2.5 Doğrulama

Dashboard → **Table Editor** → sol taraftan tabloları kontrol edin:
- `workspaces`, `ideas`, `idea_versions`, `kanban_columns`, `comments`, `notifications`, `board_templates`, `workspace_members` tablolarının hepsi görünüyor olmalı.
- `board_templates` tablosuna tıklayın → 2 satır olmalı ("Basit Kanban", "İptal Takipli Kanban").

### Sık Karşılaşılan Hatalar

| Hata mesajı (yaklaşık) | Sebep | Çözüm |
|---|---|---|
| `Cannot find project ref` / `access token not provided` | `supabase login` yapılmamış | Adım 2.1'i çalıştırın |
| `password authentication failed for user "postgres"` | Yanlış veritabanı şifresi | Dashboard → Database → Reset Database Password, sonra `supabase link`'i tekrar çalıştırın |
| `failed to connect... timeout` | Firewall/ağ veya proje henüz tam ayağa kalkmamış | Supabase projesinin Dashboard'da "Active" durumda olduğundan emin olun, birkaç dakika bekleyip tekrar deneyin |
| `relation "..." already exists` | Daha önce Dashboard'un SQL Editor'ünden elle bir tablo/fonksiyon oluşturulmuş, migration'la çakışıyor | O nesneyi SQL Editor'den elle silin (`DROP TABLE ...` / `DROP FUNCTION ...`) ve `db push`'u tekrar çalıştırın — **ya da** yeni/boş bir Supabase projesiyle baştan başlayın (en temiz yol) |
| `Docker` ile ilgili bir hata | `db push` Docker gerektirmez (sadece yerel `supabase start`/`db reset` Docker ister) — bu hatayı görüyorsanız muhtemelen yanlışlıkla `supabase start` veya `db reset` çalıştırdınız | Doğru komut `npx supabase db push`, `db reset` değil |
| `function uuid_generate_v4() does not exist` (`SQLSTATE 42883`) | Supabase Cloud'da `uuid-ossp` extension'ının fonksiyonları `public` değil `extensions` şemasına kuruluyor; migration'lar bu şemayı `search_path`'e eklemediğinden fonksiyon bulunamıyor | Bu proje artık `uuid_generate_v4()` yerine Postgres'e gömülü `gen_random_uuid()` kullanıyor (hiçbir extension gerektirmez) — güncel migration dosyalarıyla bu hata bir daha çıkmaz. Eğer kendi eklediğiniz bir migration'da hâlâ `uuid_generate_v4()` kullanıyorsanız, onu da `gen_random_uuid()` ile değiştirin |
| `failed to cache migrations catalog` / `password authentication failed for user "cli_login_postgres"` uyarısı, ama sonunda `"message":"Finished supabase db push."` görünüyor | CLI'nin dahili önbellekleme adımına ait, **zararsız bir uyarı** — migration'lar zaten uygulandı | Yok sayabilirsiniz. Emin olmak için `npx supabase migration list --linked` çalıştırıp `local` ve `remote` sütunlarının eşleştiğini görün |

Yukarıdakilerden hiçbiri tuttuğunuz hatayla eşleşmiyorsa, **tam hata mesajını bana yapıştırın**, birlikte bakalım.

## 3. Google OAuth Client Oluşturma

### 3.1 Google Cloud Console'da Client ID

1. [Google Cloud Console](https://console.cloud.google.com) → bir proje seçin/oluşturun.
2. **APIs & Services → OAuth consent screen**: uygulama adı, destek e-postası vb. temel bilgileri doldurup yayınlayın (test modunda kalabilir, sadece belirlediğiniz test kullanıcıları giriş yapabilir; herkese açmak için Google'ın doğrulama sürecinden geçmeniz gerekir).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type: **Web application**.
4. **Authorized redirect URIs** kısmına şunu ekleyin:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
   > Buraya uygulamanızın kendi `/auth/callback` rotası **eklenmez** — çünkü `signInWithOAuth` akışında Google, kullanıcıyı önce Supabase'in callback endpoint'ine yönlendirir; Supabase kodu işleyip session kurduktan sonra bizim belirttiğimiz `redirectTo` adresine (uygulamanın `/auth/callback`'i) yönlendirir.
   - Yerel geliştirmede Google OAuth'u test etmek isterseniz ayrıca şunu da ekleyebilirsiniz: `http://127.0.0.1:54321/auth/v1/callback`
5. Oluşturulan **Client ID** ve **Client Secret**'i not alın.

### 3.2 Supabase Dashboard'da Google Provider'ı Aktifleştirme

1. Supabase Dashboard → **Authentication → Providers → Google**.
2. **Enable Sign in with Google**'ı açın.
3. `Client ID` ve `Client Secret` alanlarına 3.1'de aldığınız değerleri girin.
4. Kaydedin.

### 3.3 Supabase Redirect URL Allow-list

Supabase Dashboard → **Authentication → URL Configuration**:
- **Site URL**: `https://<production-domain>`
- **Redirect URLs** (allow-list):
  ```
  http://localhost:3000/**
  https://<production-domain>/**
  ```
  > Vercel Preview deploy'ları (`*.vercel.app`) için OAuth test edilecekse `https://*.vercel.app/**` de eklenmeli; prod'a geçince bu wildcard kaldırılmalı (güvenlik açısından gereksiz genişlik).

---

## 4. GitHub Reposu Oluşturma

Proje henüz bir git deposu değilse:

```bash
git init
git add .
git commit -m "Initial commit"
```

GitHub'da boş bir repo oluşturup uzak adresi ekleyin:

```bash
git remote add origin https://github.com/<kullanici-adi>/<repo-adi>.git
git branch -M main
git push -u origin main
```

> `.env.local` zaten `.gitignore`'da — gerçek anahtarların yanlışlıkla commit edilmediğini `git status` ile kontrol edin.

---

## 5. Vercel'e Deploy

### 5.1 Proje Import

1. [vercel.com](https://vercel.com) → **Add New → Project** → GitHub reponuzu seçin (ilk kullanımda GitHub hesabınızı Vercel'e bağlamanız istenir).
2. Framework otomatik **Next.js** olarak algılanır; build command/output için özel bir ayar gerekmez.

### 5.2 Ortam Değişkenleri

**Project Settings → Environment Variables** altında, her değişkeni **Production** ve **Preview** scope'ları için ayrı ayrı girin (Development scope'a gerek yok, o yerel `.env.local`'den okunuyor):

| Değişken | Production değeri | Preview değeri |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase prod proje URL'i | aynı |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase prod anon key | aynı |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase prod service_role key | aynı |
| `GOOGLE_CLIENT_ID` | Adım 3.1'deki Client ID | aynı |
| `GOOGLE_CLIENT_SECRET` | Adım 3.1'deki Client Secret | aynı |
| `NEXT_PUBLIC_APP_URL` | `https://<production-domain>` | `https://$VERCEL_URL` |

### 5.3 Deploy

**Deploy** butonuna basın. Vercel, `main` branch'ine her push'ta otomatik production deploy, diğer branch'lere/PR'lara otomatik preview deploy yapar.

### 5.4 Domain (opsiyonel)

Başlangıçta Vercel'in verdiği `<proje-adi>.vercel.app` adresi kullanılabilir. Kendi domaininizi bağlamak isterseniz: **Project Settings → Domains** → domain ekleyin, DNS sağlayıcınızda gösterilen kaydı (CNAME/A) tanımlayın.

> Domain değiştiğinde/eklendiğinde **Adım 3.3 ve 3.1'deki redirect URL'leri güncellemeyi unutmayın** — `<production-domain>` her yerde gerçek domaininizle değişmeli.

---

## 6. Deploy Sonrası Doğrulama Checklist

- [ ] `https://<production-domain>` açılıyor, `/login` sayfası görünüyor.
- [ ] Email/şifre ile kayıt olup giriş yapılabiliyor.
- [ ] "Google ile devam et" butonu gerçek Google hesabıyla giriş yaptırıyor ve `/workspaces`'e yönlendiriyor.
- [ ] Workspace oluşturma (şablonlu) çalışıyor, `board_templates` seed verisi görünüyor.
- [ ] Davet linkiyle (`/join/<invite_code>`) ikinci bir hesapla katılım çalışıyor.
- [ ] Kanban board: kolon oluşturma/silme, fikir oluşturma/düzenleme (versiyon artışı), kart sürükleme, CANCELLED kolonuna taşımada iptal sebebi zorunluluğu çalışıyor.
- [ ] Yorum ekleme ve bildirim (bell ikonu, unread badge) çalışıyor.
- [ ] Supabase Dashboard → **Logs**'ta beklenmeyen hata yok.

## 7. Sonraki Deploy'lar

Migration eklediğinizde (yeni `supabase/migrations/*.sql` dosyası):

```bash
npx supabase db push --linked
```

komutunu prod'a karşı çalıştırmayı unutmayın — Vercel deploy'u kod değişikliğini otomatik yayınlar ama **veritabanı şeması ayrı bir adımla senkronize edilmelidir**.
