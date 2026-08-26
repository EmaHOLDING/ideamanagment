/**
 * İçe aktarılan Markdown'ın dashboard tipografisini bozmasını önler.
 * Başlık hiyerarşisi korunur fakat fikir gövdesinde en büyük seviye h3'tür.
 * Satır içi HTML ile taşınabilecek font-size/font-family stilleri kaldırılır.
 */
export function normalizeIdeaMarkdown(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "### ")
    .replace(/<(h[1-6])(?:\s[^>]*)?>/gi, "### ")
    .replace(/<\/h[1-6]>/gi, "")
    .replace(/\sstyle=(['"])[^'"]*(?:font-size|font-family)[^'"]*\1/gi, "")
    .trim();
}
