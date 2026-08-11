# OAuth Sağlayıcı Kurulum Rehberi

Bu rehber, Fikir Kuluçkası'nda etkinleştirilen 5 giriş sağlayıcısı (Google, Microsoft/Entra ID, LinkedIn, GitHub, GitLab) için gerekli **Client ID / Client Secret** değerlerini nasıl oluşturacağını ve nereye gireceğini anlatır. Kod tarafında hepsi zaten bağlı (`supabase/config.toml` + `components/auth/auth-form.tsx`); yapman gereken tek şey her sağlayıcıda bir uygulama/app kaydı oluşturup aldığın key'leri aşağıdaki ortam değişkenlerine yazmak.

---

## Ortak kavram: Redirect URI

Her sağlayıcıda, kullanıcı giriş yaptıktan sonra sağlayıcının kimin geri döneceğini bilmesi için bir **"Authorized redirect URI"** (veya "Callback URL") tanımlaman isteniyor. Bu adres, senin uygulamanın adresi **değil**, Supabase'in kendi callback endpoint'i:

| Ortam | Redirect URI (sağlayıcıya girilecek adres) |
|---|---|
| **Yerel geliştirme** | `http://127.0.0.1:54321/auth/v1/callback` |
| **Canlı (production)** | `https://iipbbndpyxnhevaifxno.supabase.co/auth/v1/callback` |

Her sağlayıcı için **her iki adresi de** ekleyebiliyorsan ikisini de ekle (Google'da yaptığın gibi) — böylece hem yerelde hem canlıda aynı uygulama kaydını kullanabilirsin. Sağlayıcı tek bir redirect URI'ye izin veriyorsa, geliştirme sırasında geçici olarak yerel adresi, yayına almadan önce de canlı adresi kullan.

**Not:** Bu rehberdeki key'leri girdikten sonra yerelde test edebilmen için `.env.local`'i doldurup `supabase stop && supabase start` ile Supabase'i yeniden başlatman gerekiyor (config.toml değişiklikleri sadece yeniden başlatınca okunuyor).

---

## 1. Google (zaten kurulu — referans olarak)

- **Nereden:** [Google Cloud Console](https://console.cloud.google.com/) → API'ler ve Hizmetler → Kimlik Bilgileri → OAuth 2.0 İstemci Kimliği (Web uygulaması).
- **Authorized redirect URIs:** yukarıdaki iki adres.
- **.env.local değişkenleri:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (zaten dolu).

---

## 2. Microsoft / Entra ID (Office 365)

- **Nereden:** [Azure Portal](https://portal.azure.com/) → **Microsoft Entra ID** → **App registrations** → **New registration**.
- **Kurulum adımları:**
  1. Uygulama adı: örn. "Fikir Kuluçkası".
  2. **Supported account types:** kimlerin giriş yapabileceğini seçiyor:
     - *Sadece kendi organizasyonun (tek kiracı/single-tenant)* → "Accounts in this organizational directory only".
     - *Herkesin kendi Microsoft/Office 365 hesabıyla girebilmesi* → "Accounts in any organizational directory and personal Microsoft accounts".
  3. **Redirect URI:** platform olarak **"Web"** seç, yukarıdaki iki adresi ekle.
  4. Kayıt tamamlanınca **Overview** sayfasında **Application (client) ID** görünür → bu `AZURE_CLIENT_ID`.
  5. Sol menüden **Certificates & secrets** → **New client secret** → oluşan **Value** (sadece bir kez gösterilir, hemen kopyala) → bu `AZURE_CLIENT_SECRET`.
  6. **Sadece tek kiracılı (single-tenant)** seçtiysen, sol menüden **Overview**'daki **Directory (tenant) ID**'yi al ve `AZURE_URL` değişkenine şu formatta yaz:
     ```
     https://login.microsoftonline.com/<TENANT_ID>/v2.0
     ```
     Herkese açık (multi-tenant) seçtiysen `AZURE_URL`'i **boş bırak**.
- **.env.local değişkenleri:** `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_URL` (opsiyonel).

---

## 3. LinkedIn

- **Nereden:** [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps) → **Create app**.
- **Kurulum adımları:**
  1. Uygulama adı, şirket sayfası (bir LinkedIn şirket sayfası bağlamak zorunlu — yoksa önce boş bir tane oluşturman gerekebilir), logo gibi bilgileri doldur.
  2. Uygulama oluşunca **Products** sekmesinden **"Sign In with LinkedIn using OpenID Connect"** ürününü ekle (onay genelde anında geliyor).
  3. **Auth** sekmesinde **Authorized redirect URLs for your app** alanına yukarıdaki iki adresi ekle.
  4. Aynı sekmede **Client ID** ve **Client Secret** görünür.
- **.env.local değişkenleri:** `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`.

---

## 4. GitHub

- **Nereden:** GitHub → sağ üst profil → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**.
  (Kurumsal bir GitHub organizasyonu için `Organization settings → Developer settings` üzerinden de oluşturulabilir.)
- **Kurulum adımları:**
  1. **Application name:** örn. "Fikir Kuluçkası".
  2. **Homepage URL:** uygulamanın ana adresi (örn. canlı domain'in, yerelde `http://localhost:3000`).
  3. **Authorization callback URL:** GitHub OAuth App'lerde **tek bir** callback URL'e izin veriliyor — geliştirme sırasında yerel adresi (`http://127.0.0.1:54321/auth/v1/callback`), yayına almadan önce canlı adresi (`https://iipbbndpyxnhevaifxno.supabase.co/auth/v1/callback`) gir. İkisini birden test etmek istersen iki ayrı OAuth App oluşturup gerektiğinde `.env.local`/canlı ortamda ilgili key'i kullanabilirsin.
  4. Kayıt sonrası **Client ID** görünür; **Generate a new client secret** ile **Client Secret** oluştur.
  5. Not: bazı GitHub hesaplarında e-posta adresi gizli/paylaşılmıyor olabilir — bu ihtimale karşı Supabase tarafında bu sağlayıcı için e-posta zorunluluğu zaten kapatıldı (`email_optional = true`), ek bir işlem gerekmiyor.
- **.env.local değişkenleri:** `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.

---

## 5. GitLab

- **Nereden:** [gitlab.com](https://gitlab.com/) → sağ üst profil → **Edit profile** → **Applications** (self-hosted bir GitLab kullanıyorsan kendi instance'ının aynı yolundan).
- **Kurulum adımları:**
  1. **Name:** örn. "Fikir Kuluçkası".
  2. **Redirect URI:** yukarıdaki iki adresi ekle (GitLab birden fazla redirect URI'ye izin verir, her satıra bir tane).
  3. **Scopes:** en azından `openid`, `profile`, `email` işaretle.
  4. Kaydedince **Application ID** (`GITLAB_CLIENT_ID`) ve **Secret** (`GITLAB_CLIENT_SECRET`) görünür.
  5. **Self-hosted bir GitLab** (gitlab.com değil, şirketin kendi GitLab sunucusu) kullanıyorsan, `GITLAB_URL` değişkenine o instance'ın adresini yaz (örn. `https://gitlab.senisirketin.com`). gitlab.com kullanıyorsan `GITLAB_URL`'i **boş bırak**.
- **.env.local değişkenleri:** `GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET`, `GITLAB_URL` (opsiyonel).

---

## Tüm değişkenlerin özeti

`.env.local` dosyasında şu an boş duran, doldurman gereken satırlar:

```
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_URL=

LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

GITLAB_CLIENT_ID=
GITLAB_CLIENT_SECRET=
GITLAB_URL=
```

Doldurduktan sonra yerelde test etmek için:

```bash
supabase stop
supabase start
```

## Canlı (production) sistemde ek adım

Yukarıdaki `.env.local` değerlerini canlı ortamın kendi environment variable ayarına (örn. Vercel → Project Settings → Environment Variables) aynı isimlerle eklemen yeterli — kod tarafında ekstra bir değişiklik gerekmiyor.

Ayrıca canlı Supabase projesinde (bu, `supabase/config.toml`'dan **bağımsız** bir ayar — sadece yerel CLI'yi etkiler): Supabase Dashboard → **Authentication → Providers**'dan her sağlayıcıyı tek tek **enable** edip aynı Client ID/Secret'ları oraya da girmen gerekiyor. Aynı ekranda **Authentication → URL Configuration**'da **Site URL** ve **Redirect URLs** alanlarının canlı domain'ini (`https://<canlı-domain>/**`) içerdiğinden emin ol — bu ayar eksik/yanlışsa, yerelde daha önce yaşadığımız "giriş yapılıyor ama uygulama login ekranında kalıyor" sorunu canlıda da tekrar eder.
