import type { Metadata } from "next";

import { redirectIfAlreadyAuthenticated } from "@/lib/auth/redirect-if-authenticated";
import { safeRedirect } from "@/lib/auth/post-auth-destination";

import LoginFormLazy from "@/app/(marketing)/login/login-form-lazy";

export const metadata: Metadata = {
  title: "Sign in — iPix",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await redirectIfAlreadyAuthenticated("/login");
  const { next } = await searchParams;
  // Repeated `next` keys arrive as an array — normalize to the first value
  // (or reject) so safeRedirect never receives a non-string.
  const nextValue = Array.isArray(next) ? next[0] : next;
  return <LoginFormLazy next={safeRedirect(nextValue)} />;
}
