import { Suspense } from "react";
import type { Metadata } from "next";
import { WeekPlanner } from "@/components/app/WeekPlanner";
import { Loading } from "@/components/app/ui";

export const metadata: Metadata = { title: "Your week" };

export default function WeekPage() {
  return (
    <Suspense fallback={<Loading />}>
      <WeekPlanner />
    </Suspense>
  );
}
