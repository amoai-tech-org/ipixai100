"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

// Scroll-reveal helper: an IntersectionObserver toggles `data-shown` once the
// element scrolls into view; CSS (.mk-reveal in marketing.css) does the
// transition. Falls back to immediately-visible when the observer is
// unavailable, and the `scripting: none` CSS rule keeps SSR markup visible.
export function AnimatedSection({
  as: Tag = "div",
  className = "",
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <Tag ref={ref} data-shown={shown} className={`mk-reveal ${className}`}>
      {children}
    </Tag>
  );
}