/**
 * IPI-1089 · ONBOARD-001 — the one URL rule, on its own.
 *
 * Adapted from amoai-tech/luminaai (app/src/lib/onboarding/validate-url.ts).
 * The website is OPTIONAL for tenancy: blank returns null (valid). A non-blank
 * value must be a real http(s) URL, or the field blocks — an error is never
 * carried forward into materialization.
 */
const INVALID_URL = "Enter a valid URL starting with http:// or https://";

export const validateUrl = (url: string): string | null => {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Reject whitespace outright — the browser URL parser percent-encodes it
  // into a hostname that can never resolve, and a crawl would fail later.
  if (/\s/.test(trimmed)) return INVALID_URL;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return INVALID_URL;
    }
    return null;
  } catch {
    return INVALID_URL;
  }
};