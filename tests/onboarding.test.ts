import { describe, expect, it, vi } from "vitest";

import {
  getOrCreateOnboardingIdempotencyKey,
  getOrCreateOnboardingSession,
  materializeOnboarding,
  parseDraftAnswers,
  serializeDraftAnswers,
  updateOnboardingSessionDraft,
  validateUrl,
} from "@/lib/onboarding";

describe("validateUrl (IPI-1089 — website optional for tenancy)", () => {
  it("accepts blank (optional)", () => {
    expect(validateUrl("")).toBeNull();
    expect(validateUrl("   ")).toBeNull();
  });

  it("accepts http(s) URLs", () => {
    expect(validateUrl("https://maisonnoir.com")).toBeNull();
    expect(validateUrl("http://maisonnoir.com")).toBeNull();
  });

  it("rejects malformed and non-http(s) URLs", () => {
    expect(validateUrl("not-a-url")).not.toBeNull();
    expect(validateUrl("maisonnoir")).not.toBeNull();
    expect(validateUrl("ftp://maisonnoir.com")).not.toBeNull();
    expect(validateUrl("https://exa mple.com")).not.toBeNull();
  });
});

describe("getOrCreateOnboardingIdempotencyKey", () => {
  it("creates a stable per-user key", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    const a = getOrCreateOnboardingIdempotencyKey("user-1", storage);
    const b = getOrCreateOnboardingIdempotencyKey("user-1", storage);
    expect(a).toBe(b);
    const c = getOrCreateOnboardingIdempotencyKey("user-2", storage);
    expect(c).not.toBe(a);
  });

  it("throws without a user id", () => {
    expect(() => getOrCreateOnboardingIdempotencyKey("", {} as Storage)).toThrow();
  });
});

describe("session draft round-trip", () => {
  it("serializes and parses brandName + websiteUrl", () => {
    const raw = serializeDraftAnswers({ brandName: "Maison Noir", websiteUrl: "https://maisonnoir.com" });
    expect(parseDraftAnswers(raw)).toEqual({
      brandName: "Maison Noir",
      websiteUrl: "https://maisonnoir.com",
    });
  });

  it("falls back to empty draft for junk", () => {
    expect(parseDraftAnswers(null)).toEqual({ brandName: "", websiteUrl: "" });
    expect(parseDraftAnswers({ brandName: 42 })).toEqual({ brandName: "", websiteUrl: "" });
  });
});

function mockSupabase(): any {
  const calls: { table: string; op: string }[] = [];
  const supabase = {
    calls,
    from: vi.fn(() => supabase),
    select: vi.fn(() => supabase),
    eq: vi.fn(() => supabase),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(() => supabase),
    update: vi.fn(() => supabase),
    rpc: vi.fn(),
  };
  return supabase;
}

describe("getOrCreateOnboardingSession", () => {
  it("returns an existing draft", async () => {
    const supabase = mockSupabase();
    const session = {
      id: "11111111-1111-1111-1111-111111111111",
      user_id: "22222222-2222-2222-2222-222222222222",
      idempotency_key: "key-1",
      status: "draft",
      current_screen: 1,
      draft_answers: {},
      organization_id: null,
      brand_id: null,
    };
    supabase.maybeSingle.mockResolvedValue({ data: session, error: null });
    const result = await getOrCreateOnboardingSession(
      supabase as never,
      session.user_id,
      "key-1",
    );
    expect(result).toEqual(session);
  });

  it("inserts a fresh draft when none exists", async () => {
    const supabase = mockSupabase();
    supabase.maybeSingle.mockResolvedValue({ data: null, error: null });
    supabase.single.mockResolvedValue({
      data: {
        id: "11111111-1111-1111-1111-111111111111",
        user_id: "22222222-2222-2222-2222-222222222222",
        idempotency_key: "key-1",
        status: "draft",
        current_screen: 1,
        draft_answers: {},
        organization_id: null,
        brand_id: null,
      },
      error: null,
    });
    const result = await getOrCreateOnboardingSession(
      supabase as never,
      "22222222-2222-2222-2222-222222222222",
      "key-1",
    );
    expect(result.status).toBe("draft");
    expect(supabase.insert).toHaveBeenCalled();
  });
});

describe("updateOnboardingSessionDraft", () => {
  it("updates draft_answers on the session row", async () => {
    const supabase = mockSupabase();
    supabase.update.mockReturnValue(supabase);
    supabase.eq.mockResolvedValue({ error: null });
    await updateOnboardingSessionDraft(supabase as never, "session-1", {
      draft_answers: { brandName: "Maison Noir" },
    });
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ draft_answers: { brandName: "Maison Noir" } }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "session-1");
  });
});

describe("materializeOnboarding", () => {
  it("calls the existing RPC with trimmed name and null url when blank", async () => {
    const supabase = mockSupabase();
    supabase.rpc.mockResolvedValue({
      data: {
        organization_id: "33333333-3333-3333-3333-333333333333",
        brand_id: "44444444-4444-4444-4444-444444444444",
      },
      error: null,
    });
    const result = await materializeOnboarding(
      supabase as never,
      { brandName: "  Maison Noir  ", websiteUrl: "" },
      { idempotencyKey: "key-1" },
    );
    expect(supabase.rpc).toHaveBeenCalledWith("materialize_onboarding_session", {
      p_idempotency_key: "key-1",
      p_brand_name: "Maison Noir",
      p_brand_url: null,
    });
    expect(result).toEqual({
      orgId: "33333333-3333-3333-3333-333333333333",
      brandId: "44444444-4444-4444-4444-444444444444",
    });
  });

  it("passes a supplied URL through", async () => {
    const supabase = mockSupabase();
    supabase.rpc.mockResolvedValue({
      data: {
        organization_id: "33333333-3333-3333-3333-333333333333",
        brand_id: "44444444-4444-4444-4444-444444444444",
      },
      error: null,
    });
    await materializeOnboarding(
      supabase as never,
      { brandName: "Maison Noir", websiteUrl: "https://maisonnoir.com" },
      { idempotencyKey: "key-1" },
    );
    expect(supabase.rpc).toHaveBeenCalledWith("materialize_onboarding_session", {
      p_idempotency_key: "key-1",
      p_brand_name: "Maison Noir",
      p_brand_url: "https://maisonnoir.com",
    });
  });

  it("throws on RPC error", async () => {
    const supabase = mockSupabase();
    supabase.rpc.mockResolvedValue({ data: null, error: { message: "unauthorized" } });
    await expect(
      materializeOnboarding(
        supabase as never,
        { brandName: "Maison Noir", websiteUrl: "" },
        { idempotencyKey: "key-1" },
      ),
    ).rejects.toThrow("unauthorized");
  });
});