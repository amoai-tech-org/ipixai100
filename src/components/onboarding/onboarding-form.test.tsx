// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// Mock every CSS module the tree imports (OnboardingForm → ErrorState).
vi.mock("../ui/error-state.module.css", () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

import { OnboardingForm } from "./onboarding-form";

type TestSession = {
  id: string;
  user_id: string;
  idempotency_key: string;
  status: string;
  current_screen: number;
  draft_answers: Record<string, unknown>;
  organization_id: string | null;
  brand_id: string | null;
};

const DRAFT_SESSION: TestSession = {
  id: "11111111-1111-1111-1111-111111111111",
  user_id: "22222222-2222-2222-2222-222222222222",
  idempotency_key: "key-1",
  status: "draft",
  current_screen: 1,
  draft_answers: { brandName: "Maison Noir", websiteUrl: "" },
  organization_id: null,
  brand_id: null,
};

const MATERIALIZED_SESSION: TestSession = {
  ...DRAFT_SESSION,
  status: "materialized",
  organization_id: "33333333-3333-3333-3333-333333333333",
  brand_id: "44444444-4444-4444-4444-444444444444",
};

function fakeSupabase(session: TestSession) {
  const supabase = {
    from: vi.fn(() => supabase),
    select: vi.fn(() => supabase),
    eq: vi.fn(() => supabase),
    maybeSingle: vi.fn().mockResolvedValue({ data: session, error: null }),
    single: vi.fn(),
    insert: vi.fn(() => supabase),
    update: vi.fn(() => supabase),
    rpc: vi.fn().mockResolvedValue({
      data: {
        organization_id: "33333333-3333-3333-3333-333333333333",
        brand_id: "44444444-4444-4444-4444-444444444444",
      },
      error: null,
    }),
  };
  return supabase;
}

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => supabaseMock,
}));

let supabaseMock: ReturnType<typeof fakeSupabase>;

const TEST_USER_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  // Seed the per-user idempotency key so the component's key matches the mock
  // session's idempotency_key ("key-1") instead of minting a fresh UUID.
  localStorage.setItem(`ipix:onboarding:idempotency:v1:${TEST_USER_ID}`, "key-1");
});

afterEach(() => {
  cleanup();
  replaceMock.mockReset();
  localStorage.clear();
});

describe("OnboardingForm (IPI-1089 · ONBOARD-001)", () => {
  it("renders the draft form for a zero-org user", async () => {
    supabaseMock = fakeSupabase(DRAFT_SESSION);
    render(<OnboardingForm userId="22222222-2222-2222-2222-222222222222" />);
    const form = await screen.findByTestId("onboarding-form");
    expect(form).toBeDefined();
    expect(screen.getByLabelText("Brand name")).toBeDefined();
    expect(screen.getByLabelText(/Website/)).toBeDefined();
  });

  it("resumes an existing draft", async () => {
    supabaseMock = fakeSupabase(DRAFT_SESSION);
    render(<OnboardingForm userId="22222222-2222-2222-2222-222222222222" />);
    await screen.findByTestId("onboarding-form");
    expect((screen.getByLabelText("Brand name") as HTMLInputElement).value).toBe("Maison Noir");
  });

  it("redirects to /app when the session is already materialized", async () => {
    supabaseMock = fakeSupabase(MATERIALIZED_SESSION);
    render(<OnboardingForm userId="22222222-2222-2222-2222-222222222222" />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/app"));
  });

  it("blocks submit when brand name is blank", async () => {
    supabaseMock = fakeSupabase({ ...DRAFT_SESSION, draft_answers: {} });
    render(<OnboardingForm userId="22222222-2222-2222-2222-222222222222" />);
    await screen.findByTestId("onboarding-form");
    fireEvent.click(screen.getByRole("button", { name: "Create brand" }));
    expect(await screen.findByTestId("onboarding-submit-error")).toBeDefined();
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });

  it("materializes and hands off to /app on submit", async () => {
    supabaseMock = fakeSupabase(DRAFT_SESSION);
    render(<OnboardingForm userId="22222222-2222-2222-2222-222222222222" />);
    await screen.findByTestId("onboarding-form");
    fireEvent.change(screen.getByLabelText("Brand name"), {
      target: { value: "Maison Noir" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create brand" }));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/app"));
    expect(supabaseMock.rpc).toHaveBeenCalledWith("materialize_onboarding_session", {
      p_idempotency_key: "key-1",
      p_brand_name: "Maison Noir",
      p_brand_url: null,
    });
  });

  it("shows a retryable error when materialization fails", async () => {
    supabaseMock = fakeSupabase(DRAFT_SESSION);
    supabaseMock.rpc.mockResolvedValue({ data: null, error: { message: "unauthorized" } });
    render(<OnboardingForm userId="22222222-2222-2222-2222-222222222222" />);
    await screen.findByTestId("onboarding-form");
    fireEvent.change(screen.getByLabelText("Brand name"), {
      target: { value: "Maison Noir" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create brand" }));
    expect(await screen.findByTestId("onboarding-submit-error")).toBeDefined();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});