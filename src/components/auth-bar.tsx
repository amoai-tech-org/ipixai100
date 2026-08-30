"use client";

export function AuthBar() {
  return (
    <form action="/auth/sign-out" method="post">
      <a href="/login">Sign in</a>
      <button type="submit">Sign out</button>
    </form>
  );
}
