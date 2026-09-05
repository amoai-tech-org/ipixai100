"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import {
  getOrCreateOnboardingIdempotencyKey,
  getOrCreateOnboardingSession,
  materializeOnboarding,
  parseDraftAnswers,
  serializeDraftAnswers,
  updateOnboardingSessionDraft,
  validateUrl,
} from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/client";

const SAVE_DEBOUNCE_MS = 400;

const inputClassName =
  "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

/**
 * IPI-1089 · ONBOARD-001 — minimal first-brand materialization.
 *
 * Brand name is required and trimmed; website is optional for tenancy and
 * validated only when supplied. The draft autosaves to the user's own
 * onboarding_sessions row (resumable across refresh), and submit calls the
 * existing materialize_onboarding_session RPC — the database atomically
 * creates the organization, owner membership (organizations_auto_add_owner),
 * and brand. On success we hand off to /app and let the existing AUTH-002
 * server routing re-resolve membership. AI/Brand DNA never blocks tenancy.
 */
export function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const key = getOrCreateOnboardingIdempotencyKey(userId);
        const session = await getOrCreateOnboardingSession(supabase, userId, key);
        if (cancelled) return;
        // Already materialized (idempotent resume) — the workspace owns the user now.
        if (session.status === "materialized") {
          router.replace("/app");
          return;
        }
        sessionIdRef.current = session.id;
        const draft = parseDraftAnswers(session.draft_answers);
        setBrandName(draft.brandName);
        setWebsiteUrl(draft.websiteUrl);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load onboarding");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (saveTimerRef.current != null) clearTimeout(saveTimerRef.current);
    };
  }, [router, userId]);

  const saveDraft = useCallback((name: string, url: string) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    if (saveTimerRef.current != null) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaving(true);
      void updateOnboardingSessionDraft(createClient(), sessionId, {
        draft_answers: serializeDraftAnswers({ brandName: name, websiteUrl: url }),
      })
        .catch(() => {
          // Autosave is best-effort — submit still has the fields from local state.
        })
        .finally(() => setSaving(false));
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = brandName.trim();
    if (!name) {
      setSubmitError("Brand name is required.");
      return;
    }
    const urlError = validateUrl(websiteUrl);
    if (urlError) {
      setSubmitError(urlError);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const supabase = createClient();
      const key = getOrCreateOnboardingIdempotencyKey(userId);
      await materializeOnboarding(supabase, { brandName: name, websiteUrl }, { idempotencyKey: key });
      router.replace("/app");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create your brand. Please try again.",
      );
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-sm text-[var(--muted-foreground)]" data-testid="onboarding-loading">
        Loading…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-8">
        <ErrorState message={loadError} />
      </div>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md" data-testid="onboarding-form">
      <CardHeader>
        <CardTitle>Set up your brand</CardTitle>
        <CardDescription>
          Create your first brand to open the workspace. You can add your website later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="brandName" className="text-sm font-medium">
              Brand name
            </label>
            <input
              id="brandName"
              name="brandName"
              value={brandName}
              onChange={(event) => {
                setBrandName(event.target.value);
                saveDraft(event.target.value, websiteUrl);
              }}
              autoComplete="organization"
              placeholder="Maison Noir"
              className={inputClassName}
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="websiteUrl" className="text-sm font-medium">
              Website{" "}
              <span className="font-normal text-[var(--muted-foreground)]">(optional)</span>
            </label>
            <input
              id="websiteUrl"
              name="websiteUrl"
              value={websiteUrl}
              onChange={(event) => {
                setWebsiteUrl(event.target.value);
                saveDraft(brandName, event.target.value);
              }}
              inputMode="url"
              autoComplete="url"
              placeholder="https://maisonnoir.com"
              className={inputClassName}
            />
          </div>

          {submitError ? (
            <p className="text-sm text-[var(--destructive)]" data-testid="onboarding-submit-error">
              {submitError}
            </p>
          ) : null}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create brand"}
          </Button>
          <p className="text-xs text-[var(--muted-foreground)]" aria-live="polite">
            {saving ? "Saving draft…" : "Your draft is saved automatically."}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}