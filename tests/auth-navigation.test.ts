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

describe("successful authentication navigates to /planner (IPI-1057)", () => {
  it("login page redirects an already-authenticated operator to /planner", async () => {
    getVerifiedOperatorFromCookies.mockResolvedValue(operator);
    await expect(LoginPage()).rejects.toThrow("REDIRECT:/planner");
    expect(redirect).toHaveBeenCalledWith("/planner");
  });

  it("login form pushes /planner after a successful password sign-in", async () => {
    render(createElement(LoginForm));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "qa@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/planner");
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("auth callback redirects to /planner after a successful code exchange", async () => {
    const url = new URL("http://localhost:3000/auth/callback?code=abc123");
    const request = { url: url.toString(), nextUrl: url } as unknown as NextRequest;
    const response = await GET(request);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/planner");
  });
});