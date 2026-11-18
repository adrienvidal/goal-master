"use client";
import { useOptimistic, useState, useTransition } from "react";
import { CATEGORIES, CATEGORY_INFO, type Category } from "@/game/notifications";
import { setCategoryMuted } from "./actions";

// Un interrupteur par catégorie ; il vaut pour le push et pour le bilan du jour par e-mail.
export function NotificationSettings({ muted }: { muted: Category[] }): React.ReactElement {
  const [optimistic, setOptimistic] = useOptimistic(muted, (current: Category[], change: { category: Category; muted: boolean }) =>
    change.muted ? [...current, change.category] : current.filter((c) => c !== change.category),
  );
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState("");

  function toggle(category: Category, on: boolean): void {
    startTransition(async () => {
      setOptimistic({ category, muted: !on });
      await setCategoryMuted(category, !on);
      setToast(`${CATEGORY_INFO[category].label} : ${on ? "activé" : "coupé, en push comme dans le bilan du soir"}.`);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col" aria-label="Ce que tu reçois">
        {CATEGORIES.map((c) => {
          const on = !optimistic.includes(c);
          return (
            <li key={c} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 border-b-2 border-dotted border-stone-2 py-2.5 last:border-b-0">
              <label htmlFor={`notif-${c}`} className="cursor-pointer font-semibold">{CATEGORY_INFO[c].label}</label>
              <input id={`notif-${c}`} type="checkbox" role="switch" className="switch row-span-2" checked={on} onChange={(e) => toggle(c, e.target.checked)} aria-describedby={`notif-${c}-hint`} />
              <small id={`notif-${c}-hint`} className="text-[13px] leading-snug text-muted">{CATEGORY_INFO[c].hint}</small>
            </li>
          );
        })}
      </ul>
      <p role="status" className="min-h-5 text-[13px] text-[var(--ok)]">{toast}</p>
    </div>
  );
}
