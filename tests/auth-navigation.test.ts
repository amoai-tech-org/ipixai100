// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
);

const push = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const getVerifiedOperatorFromCookies = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect,
  useRouter: () => ({ push, refresh }),
}));

vi.mock("../src/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      getClaims: vi.fn().mockResolvedValue({}),
    },
  }),
}));

vi.mock("../src/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

vi.mock("../src/app/login/login.module.css", () => ({
  default: new Proxy({}, { get: (_, key) => String(key) }),
}));

vi.mock("next/headers", () => ({
  cookies: () => ({ getAll: () => [], set: () => {} }),
}));

vi.mock("../src/lib/auth/copilot-hooks", () => ({
  getVerifiedOperatorFromCookies,
}));

import type { NextRequest } from "next/server";
import { GET } from "../src/app/auth/callback/route";
import { LoginForm } from "../src/app/login/login-form";
import LoginPage from "../src/app/login/page";

const operator = { id: "11111111-1111-4111-8111-111111111111", name: "qa@example.com" };

afterEach(() => {
  cleanup();
  push.mockClear();
  refresh.mockClear();
  redirect.mockClear();
  getVerifiedOperatorFromCookies.mockReset();
});

describe("successful authentication navigates to /app", () => {
  it("login page redirects an already-authenticated operator to /app", async () => {
    getVerifiedOperatorFromCookies.mockResolvedValue(operator);
    await expect(LoginPage()).rejects.toThrow("REDIRECT:/app");
    expect(redirect).toHaveBeenCalledWith("/app");
  });

  it("navigates the operator to /app after a successful password sign-in", async () => {
    // jsdom never actually navigates, so `router.push`/`refresh` are the
    // only observable signal at this component-test tier — this asserts
    // the destination string LoginForm actually requests, catching a
    // regression back to /planner (or any other wrong path) fast and
    // without a browser. The real user-observable proof of landing on
    // /app lives in e2e/login-journey.spec.ts, which drives the real
    // login form through a real browser and asserts the resulting
    // `page.url()` via the shared signInWithCredentials helper.
    render(createElement(LoginForm));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "qa@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/app");
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("auth callback redirects to /app after a successful code exchange", async () => {
    const url = new URL("http://localhost:3000/auth/callback?code=abc123");
    const request = { url: url.toString(), nextUrl: url } as unknown as NextRequest;
    const response = await GET(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/app");
  });
});