"use client";

import { useState } from "react";
import { ArrowRight, Check, ShoppingBag } from "lucide-react";
import { formatRupees } from "@/domain/units";
import type { Basket } from "@/intelligence";

/** A presentation toggle over the derived basket, never a second plan. */
export function BasketReveal({ basket }: { basket: Basket }) {
  const [showKitchen, setShowKitchen] = useState(false);
  const covered = basket.items.filter((item) => item.status === "covered");
  const missing = basket.items.filter((item) => item.status === "buy");
  const unavailable = basket.items.filter((item) => item.status === "unavailable");

  return (
    <div className="basket-reveal">
      <div className="reveal-header"><ShoppingBag size={22} aria-hidden /><span>Your shopping list, reconsidered.</span></div>
      <div className="reveal-count" aria-live="polite"><strong>{showKitchen ? missing.length : basket.items.length}</strong><span>{showKitchen ? "ingredients to buy" : "ingredients in the plan"}</span></div>
      <div className="reveal-ingredients">
        {basket.items.map((item) => <span key={item.ingredientId} className={showKitchen && item.status === "covered" ? "reveal-owned" : ""}>{showKitchen && item.status === "covered" ? <Check size={12} aria-hidden /> : null}{item.ingredient.name}</span>)}
      </div>
      <button type="button" className="reveal-button" aria-pressed={showKitchen} onClick={() => setShowKitchen((current) => !current)}>{showKitchen ? "See the full ingredient list" : "Now, check the kitchen"}<ArrowRight size={17} aria-hidden /></button>
      <p className="reveal-result" aria-live="polite">{showKitchen ? `${covered.length} fully covered at home. Basket estimate: ${formatRupees(basket.totalCost)}.` : "Some of this is already in the pantry. Let’s take a look."}{showKitchen && unavailable.length > 0 ? ` ${unavailable.length} unavailable.` : ""}</p>
      <p className="home-caption">Demo prices · pantry stock is subtracted before packs are chosen</p>
    </div>
  );
}
