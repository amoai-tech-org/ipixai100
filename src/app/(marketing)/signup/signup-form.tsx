"use client";

import { AuthForm } from "@/components/auth/auth-form";

// IPI-1157 · AUTH-UX-001 — /signup is signup intent only; shares the exact
// same auth core (Supabase client, duplicate-submit guard, error copy,
// confirmation state, OAuth) as /login via AuthForm mode="signup".
export function SignupForm({ next }: { next: string | null }) {
  return <AuthForm mode="signup" next={next} />;
}
