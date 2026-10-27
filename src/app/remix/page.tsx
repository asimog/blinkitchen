import type { Metadata } from "next";
import { Remix } from "@/components/app/Remix";

export const metadata: Metadata = { title: "Next week, remixed" };

export default function RemixPage() {
  return <Remix />;
}
