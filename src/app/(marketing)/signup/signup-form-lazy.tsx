"use client";

import dynamic from "next/dynamic";

// Client-only mount: the form only appears after React is running, so the
// submit button's onClick is always attached when the user interacts with it
// (avoids a pre-hydration click being lost on the server-rendered form).
const SignupForm = dynamic(
  () => import("./signup-form").then((m) => m.SignupForm),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="p-8 text-center text-sm">
        Loading sign up…
      </p>
    ),
  },
);

export default function SignupFormLazy({ next }: { next: string | null }) {
  return <SignupForm next={next} />;
}
