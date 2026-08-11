type DisplayableUser = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

/** Kullanıcının gösterilecek adı: önce (artık kaldırılmış e-posta/şifreli
 * kayıt formundan kalma, eski kullanıcılarda hâlâ mevcut olabilecek)
 * first_name+last_name, sonra Google'ın doldurduğu full_name, sonra email. */
export function getDisplayName(user: DisplayableUser | null | undefined): string {
  if (!user) return "Bir kullanıcı";
  const meta = user.user_metadata ?? {};

  const firstName = typeof meta.first_name === "string" ? meta.first_name.trim() : "";
  const lastName = typeof meta.last_name === "string" ? meta.last_name.trim() : "";
  if (firstName || lastName) return `${firstName} ${lastName}`.trim();

  const fullName = meta.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();

  return user.email ?? "Bir kullanıcı";
}

/** Avatar baş harfleri: iki kelimeli isimde ilk harflerin birleşimi,
 * tek kelimede ilk iki karakter. */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
