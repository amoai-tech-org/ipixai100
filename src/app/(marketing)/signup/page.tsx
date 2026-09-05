import type { Metadata } from "next";

import { redirectIfAlreadyAuthenticated } from "@/lib/auth/redirect-if-authenticated";
import { safeRedirect } from "@/lib/auth/post-auth-destination";

import SignupFormLazy from "@/app/(marketing)/signup/signup-form-lazy";

export const metadata: Metadata = {
  title: "Sign up — iPix",
  robots: { index: false, follow: false },
};

// IPI-1157 · AUTH-UX-001 — /signup is a distinct route from /login (was a
// client-side mode switch on /login). Shares the already-authenticated guard
// with /login via redirectIfAlreadyAuthenticated.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await redirectIfAlreadyAuthenticated("/signup");
  const { next } = await searchParams;
  // Repeated `next` keys arrive as an array — normalize to the first value
  // (or reject) so safeRedirect never receives a non-string.
  const nextValue = Array.isArray(next) ? next[0] : next;
  return <SignupFormLazy next={safeRedirect(nextValue)} />;
}
