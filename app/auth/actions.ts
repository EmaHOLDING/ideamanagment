"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

const signUpSchema = credentialsSchema.extend({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

export async function signInWithPassword(email: string, password: string) {
  const input = credentialsSchema.parse({ email, password });
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword(input);
  if (error) throw new Error(error.message);

  return { success: true };
}

export async function signUpWithPassword(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  const input = signUpSchema.parse({ email, password, firstName, lastName });
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        full_name: `${input.firstName} ${input.lastName}`,
      },
    },
  });
  if (error) throw new Error(error.message);

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);

  return { success: true };
}
