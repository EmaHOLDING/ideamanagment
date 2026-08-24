/** Özellik bayrakları.
 *
 * Bir özelliği kapatmak kodu silmek anlamına gelmiyor: bayrak `false` iken
 * hem arayüz gizleniyor hem de ilgili server action'lar isteği reddediyor
 * (yalnızca arayüzü gizlemek yeterli değildir — action'lar doğrudan
 * çağrılabilir). Yeniden açmak için tek satır yeterli.
 */
export const FEATURES = {
  /** Fikirlere dosya/ek yükleme. Geçici olarak kapalı.
   * Kapalıyken: yükleme alanı ve ek listesi gizlenir, attachmentActions
   * içindeki tüm action'lar hata fırlatır. Mevcut kayıtlar ve depodaki
   * dosyalar SİLİNMEZ — bayrak açılınca aynen geri gelir. */
  attachments: false,
} as const;
