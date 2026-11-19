"use client";
import { useState } from "react";
import { SubmitButton } from "@/components/LinkButton";
import { unlinkWidget } from "./actions";

/** « Couper le lien », confirmé dans l'écran (pas de boîte de dialogue). */
export function UnlinkButton(): React.ReactElement {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return <button type="button" className="btn ghost !text-[10px] !text-danger" onClick={() => setAsking(true)}>Couper le lien</button>;
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">job-finder n&apos;ajoutera plus tes candidatures. Celles déjà comptées restent, avec leurs XP.</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn ghost !text-[10px]" onClick={() => setAsking(false)}>Garder</button>
        <form action={unlinkWidget}>
          <SubmitButton className="btn ghost !text-[10px] !text-danger">Couper</SubmitButton>
        </form>
      </div>
    </div>
  );
}
