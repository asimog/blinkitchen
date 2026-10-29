import type { Metadata } from "next";
import { HomeCheck } from "@/components/app/HomeCheck";

export const metadata: Metadata = { title: "At home" };

export default function StockPage() {
  return <HomeCheck />;
}
