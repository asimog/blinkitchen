"use client";

import Link from "next/link";
import { useStoredKitchen } from "@/storage/use-stored-kitchen";
import { BuildWizard } from "@/components/onboarding/BuildWizard";

/** Client shell for /build: the wizard needs the browser-stored household. */
export function BuildExperience() {
  const stored = useStoredKitchen();
  const existing = stored.status === "ready" ? stored.kitchen : null;

  return (
    <>
      <section style={{ padding: "2rem 0 1rem", maxWidth: "60ch" }}>
        <p className="eyebrow">Build · stored only in this browser</p>
        <h1 style={{ fontSize: "1.9rem" }}>Build your household</h1>
        <p className="muted">
          Five short steps. Blinkitchen starts Week 1 from your answers, then learns from what you
          cook, buy, swap and waste. No account, no ordering, no charge.{" "}
          {existing ? <Link href="/kitchen">Open your kitchen</Link> : null}
        </p>
      </section>
      <BuildWizard
        {...(existing ? { existingKitchenName: existing.profile.displayName } : {})}
      />
    </>
  );
}