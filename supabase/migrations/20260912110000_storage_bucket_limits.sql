-- workspace-media bucket'ında boyut ve MIME sınırı yoktu: 10MB ve tür
-- kısıtı yalnızca uygulama kodunda (attachmentActions) uygulanıyordu.
-- Depolama API'si tarayıcıdan doğrudan çağrılabildiği için, bu kontroller
-- server action'a hiç uğramadan atlanabilirdi. Sınırları bucket'a taşıyarak
-- kuralı uygulama koduna değil, altyapıya bağlıyoruz.
--
-- Not: Ek yükleme özelliği şu an lib/features.ts'te kapalı. Bu migration
-- özelliği açmıyor; yeniden açıldığı gün sınırların yerinde olmasını
-- sağlıyor.
--
-- MIME listesi attachmentActions'taki ALLOWED_MIME_TYPES ile birebir aynı.
-- application/octet-stream bilerek YOK: .md yüklemeleri artık depoya
-- text/markdown olarak yazılıyor, dolayısıyla catch-all bir tipe gerek
-- kalmadı (catch-all olsaydı allowlist'in bir anlamı olmazdı).
UPDATE storage.buckets
SET file_size_limit = 10485760,  -- 10MB, MAX_FILE_SIZE ile aynı
    allowed_mime_types = ARRAY[
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/zip',
      'application/x-zip-compressed'
    ]
WHERE id = 'workspace-media';
