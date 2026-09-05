"use client";

import { AuthForm } from "@/components/auth/auth-form";

// IPI-1157 · AUTH-UX-001 — /login is sign-in intent only; the combined
// signin/signup mode switch moved to the shared AuthForm core, which /signup
// (src/app/(marketing)/signup/signup-form.tsx) also renders with mode="signup".
export function LoginForm({ next }: { next: string | null }) {
  return <AuthForm mode="signin" next={next} />;
}
