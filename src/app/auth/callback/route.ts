import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const providerError = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");

  function redirectToLogin(error: string, description: string | null) {
    const login = new URL("/login", request.url);
    login.searchParams.set("error", error);
    if (description) {
      login.searchParams.set("error_description", description);
    }
    return NextResponse.redirect(login);
  }

  if (providerError && !code) {
    return redirectToLogin(providerError, errorDescription);
  }

  if (code) {
    const supabase = await createClient();
    if (!supabase) {
      return redirectToLogin(
        providerError ?? "auth",
        errorDescription ?? "session_exchange_failed",
      );
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirectToLogin(
        providerError ?? "auth",
        errorDescription ?? "session_exchange_failed",
      );
    }
  }

  return NextResponse.redirect(new URL("/", request.url));
}
