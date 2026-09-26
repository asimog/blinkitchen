"use client";

import Link from "next/link";
import { useStoredKitchen } from "@/storage/use-stored-kitchen";
import { BuildWizard } from "@/components/onboarding/BuildWizard";
import styles from "@/components/onboarding/onboarding.module.css";

/** Client shell for /build: the wizard needs the browser-stored household. */
export function BuildExperience() {
  const stored = useStoredKitchen();
  const existing = stored.status === "ready" ? stored.kitchen : null;

  return (
    <div className="container">
      <section className={styles.pageIntro}>
        <p className="eyebrow">Build · stored only in this browser</p>
        <h1 className={styles.pageTitle}>Build your household</h1>
        <p className="muted" style={{ marginBottom: 0 }}>
          Three short steps, about a minute. Blinkitchen starts Week 1 from your answers, then
          learns from what you cook, buy, swap and waste. No account, no ordering, no charge.{" "}
          {existing ? <Link href="/kitchen">Open your kitchen</Link> : null}
        </p>
      </section>
      <BuildWizard
        {...(existing ? { existingKitchenName: existing.profile.displayName } : {})}
      />
    </div>
  );
}