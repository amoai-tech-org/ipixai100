"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

import styles from "./login.module.css";

// Google OAuth is shown only when the provider is configured for the target
// environment (Supabase Auth provider + redirect allow-list). Default off.
const GOOGLE_OAUTH_ENABLED =
  process.env.NEXT_PUBLIC_SUPABASE_GOOGLE_OAUTH_ENABLED === "true";

type Mode = "signin" | "signup";

export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const destination = next ?? "/app";

  async function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          setError("Sign up failed");
          return;
        }
        // Email confirmation is enabled on hosted Supabase: signUp succeeds
        // with a null session. Show a confirmation-required state instead of
        // navigating to an authenticated route.
        if (!data.session) {
          setConfirmed(true);
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
    setSubmitting(true);
    try {
      const supabase = createClient();
      const callback = new URL(`${window.location.origin}/auth/callback`);
      if (next) {
        callback.searchParams.set("next", next);
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString() },
      });
      if (error) setError("Sign in failed");
    } catch {
      setError("Sign in failed");
    } finally {
      setSubmitting(false);
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
          {confirmed ? (
            <>
              <p className={styles.confirm} role="status">
                Check your email to confirm your account. You can sign in once
                your email is confirmed.
              </p>
              <button
                type="button"
                className={styles.link}
                onClick={() => {
                  setConfirmed(false);
                  setMode("signin");
                  setError(null);
                }}
              >
                Back to sign in
              </button>
            </>
          ) : (
            <>
              <h1 className={styles.title}>
                {mode === "signin" ? "Welcome" : "Sign up"}
              </h1>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!event.currentTarget.reportValidity()) return;
              void submit();
            }}
            className={styles.form}
          >
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
            <button
              type="submit"
              className={styles.submit}
              disabled={submitting}
            >
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}