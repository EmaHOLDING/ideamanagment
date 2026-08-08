# Fikir Kuluçkası

## Tanıtım

**Fikir Kuluçkası**, ekiplerin girişim/ürün fikirlerini birlikte üretip olgunlaştırdığı, versiyonlamalı ve Kanban tabanlı bir işbirliği platformudur. Kullanıcılar workspace'ler (çalışma alanları) oluşturur, fikirleri Kanban panosunda kolonlar arasında taşıyarak süreçlerini yönetir; her fikir değişikliği bir versiyon olarak saklanır, ekip üyeleri fikirleri oylayabilir, birbirine atayabilir, etiketleyebilir, yorum yapıp birbirini etiketleyebilir (`@mention`) ve workspace'teki tüm aktiviteyi tek bir akışta takip edebilir.

Next.js (App Router) + Supabase (Postgres, Auth, RLS) üzerine kurulu, sunucu taraflı render ve Server Actions ile çalışan modern bir web uygulamasıdır.

---

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Dil | TypeScript |
| Stil | Tailwind CSS v4 |
| UI bileşenleri | shadcn/ui ("base-nova" stili, `@base-ui/react` primitive'leri) |
| Veritabanı & Auth | Supabase (Postgres + Row Level Security + Auth) |
| Sürükle-bırak | `@hello-pangea/dnd` |
| Zengin metin editörü | Tiptap (`@tiptap/react`, `@tiptap/markdown`) |
| Validasyon | Zod |
| Bildirimler (toast) | Sonner |
| İkonlar | lucide-react |

---

## Ana Özellikler

### 1. Kimlik Doğrulama
- E-posta/şifre ile kayıt ve giriş (Ad + Soyad zorunlu alan olarak alınır).
- Google OAuth ile tek tıkla giriş (Google'dan gelen isim bilgisi otomatik kullanılır).
- Oturum yönetimi `@supabase/ssr` ile cookie tabanlı; middleware her istekte oturumu tazeler.
- Kullanıcılar sistemde her yerde **"Ad Soyad"** olarak görünür (email sadece ikincil/soluk bilgi olarak gösterilir); avatar baş harfleri isimden otomatik üretilir.

### 2. Workspace (Çalışma Alanı) Yönetimi
- Workspace oluşturma — boş board ya da hazır bir şablondan.
- Davet kodu ile workspace'e katılma (`/join/[invite_code]` sayfası).
- **Roller — Owner / Member:**
  - **Owner** (kurucu): kolon ekleme/silme, şablon olarak kaydetme, üye çıkarma, davet kodunu yenileme, workspace'i silme, sahipliği başka bir üyeye devretme.
  - **Member**: fikir oluşturma/düzenleme, yorum yapma, oylama, atama, etiketleme gibi tüm işbirliği aksiyonlarına eşit erişim.
  - Owner, sahipliği devretmeden workspace'ten ayrılamaz.
  - Tüm yetki sınırları hem UI'da hem veritabanı seviyesinde (Row Level Security) uygulanır.
- Üye listesi görüntüleme (isim, rol, katılma tarihi).

### 3. Kanban Board
- Şablondan gelen kolonlar **sabittir** (sürüklenemez); sadece fikir kartları kolonlar arası sürükle-bırak ile taşınır.
- Kolon oluşturma/silme (yalnızca Owner) — dolu bir kolon silinemez, önce fikirlerin taşınması/silinmesi gerekir.
- Bir fikir "İptal" statüsündeki bir kolona taşınırken **iptal sebebi zorunlu** olarak istenir.
- Board üstünde **arama + filtre çubuğu**: başlık/içerik metni arama, etikete göre filtre, atanan kişiye göre filtre (client-side, anlık).

### 4. Fikir (Idea) Yönetimi ve Versiyonlama
- Her fikir; başlık, zengin metin içerik (Markdown), problem tanımı, hedef kitle, etki/efor puanı (Düşük/Orta/Yüksek) alanlarını içerir.
- Fikir her güncellendiğinde **yeni bir versiyon** olarak saklanır — hiçbir önceki içerik kaybolmaz.
- **Versiyon Geçmişi** modalı: tüm versiyonları yan yana karşılaştırmalı gösterir, hangi alanların değiştiğini rozetlerle işaretler, her versiyonun yazarını ve tarihini gösterir.
- İçerik editörü Tiptap tabanlıdır; **.md dosyası içe aktarma** desteği vardır (Markdown dosyasını sürükleyip editöre aktarabilirsiniz).
- Fikre **direkt link** oluşturma ("Link Kopyala") — bu link paylaşıldığında açan kişide ilgili fikrin detay penceresi otomatik açılır (`?idea=<id>` URL parametresi ile).

### 5. Oylama
- Her fikir kartında oy sayısı + oy ver/geri al butonu.
- Bir kullanıcı bir fikre yalnızca bir kez oy verebilir (toggle davranışı).
- Oylama kartın sırasını otomatik değiştirmez, sadece önceliklendirme sinyali olarak gösterilir.

### 6. Atama (Assignee)
- Bir fikir, workspace üyelerinden birine atanabilir.
- Atanan kişiye bildirim gönderilir; kartta atanan kişinin avatarı (isim baş harfleri) görünür.

### 7. Etiketler (Tags)
- Workspace'e özel, tekrar kullanılabilir, renkli etiket havuzu (serbest metin değil).
- Herhangi bir üye yeni etiket oluşturabilir/silebilir.
- Bir fikre birden fazla etiket eklenebilir; kartlarda ve filtre çubuğunda görünür.

### 8. Yorumlar ve `@Mention`
- Her fikrin kendi yorum paneli vardır (klavye ile sayfalanan — "Daha Fazla Yükle").
- Yorum yazarken `@` yazıldığında workspace üyelerinin **otomatik tamamlama listesi** açılır (isim veya email ile aranabilir, ok tuşlarıyla gezinilebilir).
- Etiketlenen kullanıcıya "sizi etiketledi" bildirimi gönderilir.
- Bir fikre daha önce yorum yapmış herkes + fikrin sahibi, yeni yorumlardan bildirim alır.

### 9. Bildirimler
- Header'daki bildirim çanı: kart taşıma, yorum, atama ve mention olaylarında bildirim üretir.
- Okundu/okunmadı durumu takip edilir, tek tek veya toplu okundu işaretlenebilir.
- Sayfalanan (keyset pagination) bildirim listesi.

### 10. Aktivite Akışı
- Workspace'teki tüm önemli olayların (fikir oluşturma/güncelleme/taşıma, kolon oluşturma/silme, yorum, oylama, atama, etiket değişikliği) kronolojik olarak listelendiği bir yan panel (Sheet).
- "Kim ne yaptı" sorusuna tek bakışta cevap verir; sayfalanabilir.

### 11. Şablonlar
- Sistem şablonları (ör. "Basit Kanban", "İptal Takipli Kanban") ile hızlı workspace kurulumu.
- Mevcut bir workspace'in kolon yapısı, kişisel şablon olarak kaydedilip sonraki workspace'lerde yeniden kullanılabilir.

---

## Fonksiyon / Server Action Envanteri

Tüm iş mantığı Next.js **Server Actions** olarak `app/actions/` altında domain bazlı dosyalarda toplanır. Her fonksiyon; Zod ile girdi doğrulaması yapar, oturum kontrolünden geçer ve Supabase RLS politikalarıyla korunur.

### `workspaceActions.ts`
| Fonksiyon | Açıklama |
|---|---|
| `createWorkspace(title, templateId?)` | Yeni workspace oluşturur, kurucuyu Owner yapar |
| `joinWorkspaceByInviteCode(inviteCode)` | Davet koduyla workspace'e katılır |
| `getMyWorkspaces()` | Kullanıcının üyesi olduğu workspace'leri listeler |
| `getWorkspaceForUser(workspaceId)` | Workspace detayını + kolonları + kullanıcının rolünü getirir |
| `getWorkspaceMembers(workspaceId)` | Üye listesini (isim, email, rol) getirir |
| `removeMember(workspaceId, userId)` | Üyeyi workspace'ten çıkarır (Owner-only) |
| `transferOwnership(workspaceId, newOwnerUserId)` | Sahipliği başka bir üyeye devreder |
| `leaveWorkspace(workspaceId)` | Kullanıcının kendisini workspace'ten çıkarır |
| `regenerateInviteCode(workspaceId)` | Davet kodunu yeniler (Owner-only) |
| `deleteWorkspaceAction(workspaceId)` | Workspace'i kalıcı olarak siler (Owner-only) |

### `columnActions.ts`
| Fonksiyon | Açıklama |
|---|---|
| `createColumn(workspaceId, title, statusType, order)` | Yeni Kanban kolonu oluşturur |
| `reorderColumns(workspaceId, orderedIds[])` | Kolon sırasını günceller |
| `deleteColumn(columnId)` | Boş bir kolonu siler (dolu kolon silinemez) |

### `ideaActions.ts`
| Fonksiyon | Açıklama |
|---|---|
| `createIdea(workspaceId, columnId, versionData)` | Yeni fikir + ilk versiyonunu oluşturur |
| `updateIdea(ideaId, versionData)` | Fikri günceller, yeni bir versiyon snapshot'ı oluşturur |
| `moveIdea(ideaId, targetColumnId, cancellationReason?)` | Fikri başka kolona taşır (iptal kolonu için sebep zorunlu) |
| `getIdeaVersionHistory(ideaId)` | Fikrin tüm versiyon geçmişini getirir |
| `deleteIdea(ideaId)` | Fikri kalıcı olarak siler |
| `assignIdea(ideaId, assigneeUserId \| null)` | Fikri bir üyeye atar/atamayı kaldırır |
| `getIdeasForWorkspace(workspaceId)` | Workspace'teki tüm fikirleri (versiyon, oy, etiket dahil) getirir |
| `toggleIdeaVote(ideaId)` | Fikre oy verir/oyu geri alır |

### `commentActions.ts`
| Fonksiyon | Açıklama |
|---|---|
| `addComment(ideaId, content, mentionedUserIds?)` | Yorum ekler, etiketlenen kullanıcılara bildirim gönderir |
| `getComments(ideaId, cursor?)` | Fikrin yorumlarını sayfalı olarak getirir |

### `tagActions.ts`
| Fonksiyon | Açıklama |
|---|---|
| `getWorkspaceTags(workspaceId)` | Workspace'in etiket havuzunu getirir |
| `createTag(workspaceId, name, color)` | Yeni etiket oluşturur |
| `deleteTag(tagId)` | Etiketi siler |
| `setIdeaTags(ideaId, tagIds[])` | Bir fikrin etiketlerini günceller |

### `activityActions.ts`
| Fonksiyon | Açıklama |
|---|---|
| `getActivityLog(workspaceId, cursor?)` | Workspace'in aktivite akışını sayfalı olarak getirir |

### `notificationActions.ts`
| Fonksiyon | Açıklama |
|---|---|
| `getNotifications(cursor?)` | Kullanıcının bildirimlerini sayfalı olarak getirir |
| `markAsRead(id)` | Tek bir bildirimi okundu işaretler |
| `markAllAsRead()` | Tüm bildirimleri okundu işaretler |

### `templateActions.ts`
| Fonksiyon | Açıklama |
|---|---|
| `getTemplates()` | Sistem + kullanıcının kendi şablonlarını getirir |
| `createTemplateFromBoard(workspaceId, title)` | Mevcut board'u şablon olarak kaydeder |

### `app/auth/actions.ts`
| Fonksiyon | Açıklama |
|---|---|
| `signInWithPassword(email, password)` | E-posta/şifre ile giriş |
| `signUpWithPassword(email, password, firstName, lastName)` | E-posta/şifre ile kayıt (isim zorunlu) |
| `signOut()` | Oturumu kapatır |

### Paylaşılan yardımcılar (`app/actions/_shared.ts`, `lib/user-display.ts`)
- `requireUser()` — oturum kontrolü, tüm action'ların ortak giriş noktası.
- `resolveAuthorProfiles(userIds[])` — kullanıcı ID'lerini isim + email'e çözer.
- `logActivity(...)` — aktivite akışına satır ekler.
- `getDisplayName(user)` / `getInitials(name)` — her yerde tutarlı isim/avatar gösterimi.
- `encodeCursor` / `decodeCursor` — keyset pagination için cursor kodlama.

---

## Veritabanı Şeması (özet)

| Tablo | Amaç |
|---|---|
| `workspaces` | Çalışma alanları (başlık, davet kodu) |
| `workspace_members` | Üyelikler + rol (`OWNER` / `MEMBER`) |
| `kanban_columns` | Board kolonları (statü tipi, sıra) |
| `ideas` | Fikirler (güncel versiyon numarası, atanan kişi, kolon) |
| `idea_versions` | Her fikrin tüm versiyon geçmişi (snapshot) |
| `idea_votes` | Oylamalar (kullanıcı başına tekil) |
| `idea_tags` | Fikir ↔ etiket ilişkisi |
| `tags` | Workspace'e özel etiket havuzu |
| `comments` | Yorumlar (`mentioned_user_ids` ile mention takibi) |
| `notifications` | Kullanıcı bildirimleri |
| `activity_log` | Workspace aktivite akışı |
| `board_templates` | Sistem + kullanıcı şablonları |

Tüm tablolarda **Row Level Security (RLS)** aktiftir; erişim kuralları hem uygulama (UI) hem veritabanı seviyesinde çift katmanlı olarak uygulanır.

---

## Klasör Yapısı (özet)

```
app/
  (auth)/                    -- login, signup sayfaları
  (app)/                     -- oturum gerektiren sayfalar
    workspaces/               -- workspace listesi
    workspace/[workspaceId]/  -- Kanban board + tüm alt bileşenler
  actions/                   -- Server Actions (domain bazlı)
  auth/                      -- auth actions + OAuth callback

components/
  ui/                        -- shadcn/ui bileşenleri
  layout/                    -- header, bildirim çanı, kullanıcı menüsü
  editor/                    -- Tiptap editör bileşenleri
  auth/                      -- auth formu

lib/
  supabase/                  -- client/server/admin Supabase istemcileri
  types/                     -- veritabanı tipleri (otomatik üretilir)
  user-display.ts            -- isim/avatar yardımcı fonksiyonları
  status.ts                  -- statü/etiket renk-etiket eşlemeleri

supabase/
  migrations/                -- tüm şema/RLS/fonksiyon migration'ları
  seed.sql                   -- sistem şablonları
```
