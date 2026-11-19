import { db } from "@/server/db";
import { UnlinkButton } from "./UnlinkButton";

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });
const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

// Bloc « job-finder » des réglages (maquette encart-job-finder, écran 3) : on y voit le lien, on peut le couper.
export async function WidgetLink({ playerId }: { playerId: string }): Promise<React.ReactElement> {
  const [key, last, count] = await Promise.all([
    db().widgetKey.findFirst({ where: { playerId, revokedAt: null }, orderBy: { createdAt: "desc" } }),
    db().application.findFirst({ where: { playerId, source: "job-finder", cancelledAt: null }, orderBy: { createdAt: "desc" } }),
    db().application.count({ where: { playerId, source: "job-finder", cancelledAt: null } }),
  ]);
  return (
    <section className="flex flex-col gap-3" aria-labelledby="job-finder">
      <h2 id="job-finder" className="text-xs uppercase tracking-wider text-muted">job-finder</h2>
      {key ? (
        <>
          <dl className="flex flex-col gap-2 border-2 border-edge bg-night p-3 text-sm">
            <Row label="État"><span className="font-display text-[9px] text-[var(--ok)]">RELIÉ</span></Row>
            <Row label="Depuis">{`${DAY.format(key.createdAt)} · ${TIME.format(key.createdAt)}`}</Row>
            <Row label="Dernière reçue">{last ? `${last.company} · ${TIME.format(last.createdAt)}` : "aucune"}</Row>
            <Row label="Comptées par job-finder">{count}</Row>
          </dl>
          <UnlinkButton />
        </>
      ) : (
        <p className="text-sm text-muted">Pas relié. Le lien se fait depuis l&apos;encart Goal Master de job-finder, bouton « Relier ».</p>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 text-right font-num text-lg leading-none">{children}</dd>
    </div>
  );
}
