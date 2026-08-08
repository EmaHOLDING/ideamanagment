"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export async function signInWithPassword(email: string, password: string) {
  const input = credentialsSchema.parse({ email, password });
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword(input);
  if (error) throw new Error(error.message);

  return { success: true };
}

export async function signUpWithPassword(email: string, password: string) {
  const input = credentialsSchema.parse({ email, password });
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp(input);
  if (error) throw new Error(error.message);

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);

  return { success: true };
}
