"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { safeRedirect } from "@/lib/auth/post-auth-destination";

import styles from "./login.module.css";

// Google OAuth is shown only when the provider is configured for the target
// environment (Supabase Auth provider + redirect allow-list). Default off.
const GOOGLE_OAUTH_ENABLED =
  process.env.NEXT_PUBLIC_SUPABASE_GOOGLE_OAUTH_ENABLED === "true";

type Mode = "signin" | "signup";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const next = safeRedirect(searchParams.get("next"));
  const destination = next ?? "/planner";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittedRef.current) return;
    submittedRef.current = true;
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          setError("Sign up failed");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError("Sign in failed");
          return;
        }
        await supabase.auth.getClaims();
      }
      router.push(destination);
      router.refresh();
    } catch {
      setError(mode === "signup" ? "Sign up failed" : "Sign in failed");
    } finally {
      setSubmitting(false);
      submittedRef.current = false;
    }
  }

  async function onGoogle() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError("Sign in failed");
    } catch {
      setError("Sign in failed");
    } finally {
      submittedRef.current = false;
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.stack}>
        <p className={styles.brand}>iPix</p>
        <p className={styles.lede}>
          {mode === "signin" ? "Operator sign in" : "Create your account"}
        </p>
        <div className={styles.card}>
          <h1 className={styles.title}>
            {mode === "signin" ? "Welcome" : "Sign up"}
          </h1>
          <form onSubmit={onSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className={styles.input}
                type="email"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                className={styles.input}
                type="password"
                name="password"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <button className={styles.submit} type="submit" disabled={submitting}>
              {submitting
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : "Sign up"}
            </button>
          </form>

          {GOOGLE_OAUTH_ENABLED ? (
            <>
              <div className={styles.divider}>or</div>
              <button
                type="button"
                className={styles.google}
                onClick={onGoogle}
                disabled={submitting}
              >
                Continue with Google
              </button>
            </>
          ) : null}

          <p className={styles.switch}>
            {mode === "signin" ? (
              <>
                New to iPix?{" "}
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}