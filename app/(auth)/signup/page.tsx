import { redirect } from "next/navigation";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ returnUrl?: string }>;
}) {
  const { returnUrl } = await searchParams;
  redirect(returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login");
}
