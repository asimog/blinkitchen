"use client";

import { useEffect, useRef } from "react";

/**
 * Anchor for the week content. When the week number changes, scroll the week
 * container back under the sticky site header so the viewer never lands
 * mid-page in a different week with no visible context.
 */
export function useWeekScrollAnchor(week: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const previousWeek = useRef(week);

  useEffect(() => {
    if (previousWeek.current === week) return;
    previousWeek.current = week;
    const element = ref.current;

    if (!element) return;
    const header = document.querySelector("header.site-header");
    const offset = header instanceof HTMLElement ? header.getBoundingClientRect().height : 0;
    window.scrollTo({
      top: Math.max(0, window.scrollY + element.getBoundingClientRect().top - offset - 8),
      behavior: "auto",
    });
  }, [week]);

  return ref;
}