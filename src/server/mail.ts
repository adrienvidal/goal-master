// E-mails envoyés depuis contact@viloris.io par le SMTP de Google Workspace (SMTP_USER, SMTP_PASS : mot de
// passe d'application). Hors production, tout part vers DEV_MAIL_TO (src/lib/devMail.ts) ; sans DEV_MAIL_TO ou sans
// SMTP_PASS, le message s'affiche dans le terminal.
import nodemailer from "nodemailer";
import { localRecipient } from "@/lib/devMail";
import { digestDate, type Digest } from "@/game/digest";
import { textOf, type NotificationEvent } from "@/game/notifications";

export type Mail = { to: string; subject: string; text: string; html: string };

export async function sendMail(original: Mail): Promise<void> {
  const mail = localRecipient(original, process.env);
  if (!mail) {
    console.log(`\n[e-mail non envoyé hors production, DEV_MAIL_TO absent] à ${original.to} : ${original.subject}\n${original.text}\n`);
    return;
  }
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s/g, "");
  if (!user || !pass) {
    if (process.env.NODE_ENV === "development") {
      console.log(`\n[e-mail non envoyé, pas de SMTP] à ${mail.to} : ${mail.subject}\n${mail.text}\n`);
      return;
    }
    throw new Error("SMTP_USER ou SMTP_PASS manquant : e-mail impossible");
  }
  const transport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
  await transport.sendMail({ from: `Goal Master <${user}>`, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
}

const escapeHtml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Image de scène jointe à l'e-mail : jetons d'URL et taille d'affichage. */
export type MailScene = { query: string; width: number; height: number };

const PIXEL_FONT = "'Press Start 2P','Courier New',Courier,monospace";
const BODY_FONT = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

export type DigestTally = { applications: number; xp: number; boss: { name: string; hits: number; hp: number } | null };

const plural = (n: number, word: string): string => `${n} ${word}${n > 1 ? "s" : ""}`;

/** Lien d'une ligne du bilan : le verbe dit où il mène ; pas de lien quand il n'y a rien à faire. */
function linkLabel(event: NotificationEvent): string | null {
  switch (event.kind) {
    case "nudge":
    case "remind":
    case "rust":
      return "Candidater";
    case "quest":
      return "Voir la quête";
    case "quest-done":
      return "Valider la quête";
    case "quest-end":
      return event.validated ? "Ouvrir le coffre" : "Voir la quête";
    case "challenge":
      return "Relever le défi";
    case "challenge-end":
      return "Voir le défi";
    case "arena":
      return "Entrer dans l'Arène";
    case "arena-end":
    case "arena-turn":
      return "Voir l'Arène";
    case "news":
      return "Voir la nouveauté";
    case "duel":
      return "Voir le duel";
    default:
      return null;
  }
}

/** Phrase d'aperçu de la boîte de réception, reprise en tête du texte brut. */
export function tallyLine(t: DigestTally): string {
  const parts = [plural(t.applications, "candidature"), `+${t.xp} XP`];
  if (t.boss) parts.push(`${plural(t.boss.hits, "coup")} sur ${t.boss.name.replace(/^L/, "l")}`);
  return `${parts.join(", ")}.`;
}

/**
 * Bilan du jour (maquette docs/maquettes/bilan-du-jour.html), dans le gabarit 8 bits des notifications : fond nuit,
 * cadre épais, bandeau et scène en PNG pixel art, compte du jour, résultat du duel encadré, liste horodatée.
 */
export function digestMail(to: string, digest: Digest, tally: DigestTally, now: Date, scene: MailScene | null = null): Mail {
  const base = (process.env.BETTER_AUTH_URL ?? "https://goal.viloris.io").replace(/\/$/, "");
  const settings = `${base}/reglages#notifications`;
  const date = `${digestDate(now)} · ${plural(digest.count, "nouvelle")}`;
  const why = "Tu reçois ce bilan une fois par jour, à 18 h, quand il s'est passé quelque chose. Il suit les catégories activées dans tes réglages.";
  const link = (event: NotificationEvent, style: string): string => {
    const label = linkLabel(event);
    return label ? `<a href="${base}${textOf(event).url}" style="${style}">${escapeHtml(label)}</a>` : "";
  };

  const sceneHtml = scene
    ? `<tr><td align="center" style="background:#221e40;border-bottom:3px dotted #2e2958;padding:20px 12px 0"><img src="${base}/api/email/scene?s=${encodeURIComponent(scene.query)}" width="${scene.width}" height="${scene.height}" alt="" style="display:block;max-width:100%;height:auto;image-rendering:pixelated;border:0"></td></tr>`
    : "";
  const cell = (value: string, label: string, last: boolean): string =>
    `<td align="center" style="padding:10px 6px;${last ? "" : "border-right:3px solid #2e2958;"}font-family:${BODY_FONT};font-size:11px;color:#a39dcc"><div style="font-family:${PIXEL_FONT};font-size:13px;color:#f1ecff;margin-bottom:4px">${value}</div>${label}</td>`;
  const cells = [cell(String(tally.applications), tally.applications > 1 ? "candidatures" : "candidature", false), cell(`+${tally.xp}`, "XP", !tally.boss)];
  if (tally.boss) cells.push(cell(`${tally.boss.hits}/${tally.boss.hp}`, "coups sur le boss", true));
  const tallyHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:3px solid #2e2958;margin:0 0 16px"><tr>${cells.join("")}</tr></table>`;

  let duelHtml = "";
  if (digest.duel) {
    const t = textOf(digest.duel);
    const color = digest.duel.won ? "#f2c14e" : "#e88a7a";
    duelHtml = `<div style="border:3px solid ${color};padding:12px 14px;margin:0 0 16px"><div style="font-family:${PIXEL_FONT};font-size:12px;line-height:1.6;color:${color};margin-bottom:4px">${escapeHtml(t.headline)}</div><div style="font-size:15px;line-height:1.5;color:#f1ecff;margin-bottom:6px">${escapeHtml(t.detail)}</div>${link(digest.duel, "color:#f2c14e;font-size:13px")}</div>`;
  }

  const rows = digest.lines
    .map((l, i) => {
      const t = textOf(l.event);
      const a = link(l.event, "color:#f2c14e;font-size:13px");
      const border = i === 0 ? "" : "border-top:2px solid #2e2958;";
      return `<tr><td valign="top" style="${border}padding:10px 10px 10px 0;width:52px;font-size:13px;color:#a39dcc;white-space:nowrap">${escapeHtml(l.time)}</td><td style="${border}padding:10px 0;font-size:15px;line-height:1.5;color:#f1ecff"><div style="font-weight:600">${escapeHtml(t.headline)}</div><div style="font-size:14px;color:#a39dcc">${escapeHtml(t.detail)}</div>${a}</td></tr>`;
    })
    .join("");
  const listTitle = digest.duel ? "AUSSI AUJOURD'HUI" : "CE QUI S'EST PASSÉ";
  const listHtml = rows
    ? `<div style="font-family:${PIXEL_FONT};font-size:10px;color:#a39dcc;letter-spacing:.06em;margin:0 0 6px">${listTitle}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${BODY_FONT};margin:0 0 18px">${rows}</table>`
    : "";

  const textLines = [
    ...(digest.duel ? [`${textOf(digest.duel).headline} ${textOf(digest.duel).detail}`, ""] : []),
    ...digest.lines.map((l) => `${l.time}  ${textOf(l.event).headline} ${textOf(l.event).detail}\n       ${base}${textOf(l.event).url}`),
  ];
  return {
    to,
    subject: digest.subject,
    text: `Ta journée dans Goal Master\n${date}\n\n${tallyLine(tally)}\n\n${textLines.join("\n")}\n\nOuvrir Goal Master : ${base}/\n\n${why}\nRégler mes notifications : ${settings}`,
    html: `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark">
<style>@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');</style></head>
<body style="margin:0;padding:0;background:#0e0c1d">
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(tallyLine(tally))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0c1d"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#16132a;border:4px solid #4a4380">
<tr><td style="border-bottom:4px solid #4a4380;line-height:0"><a href="${base}/"><img src="${base}/api/email/header" width="552" alt="Goal Master" style="display:block;width:100%;height:auto;image-rendering:pixelated;border:0"></a></td></tr>
${sceneHtml}
<tr><td style="padding:20px 22px 6px;font-family:${BODY_FONT};color:#f1ecff">
<h1 style="margin:0 0 6px;font-family:${PIXEL_FONT};font-size:15px;line-height:1.7;font-weight:700;color:#f2c14e">Ta journée dans Goal Master</h1>
<p style="margin:0 0 16px;font-size:13px;color:#a39dcc">${escapeHtml(date)}</p>
${duelHtml}${tallyHtml}${listHtml}
<a href="${base}/" style="display:inline-block;font-family:${PIXEL_FONT};font-size:12px;line-height:1.4;font-weight:700;color:#1a1626;background:#f2c14e;padding:13px 16px;border-right:4px solid #b9831c;border-bottom:4px solid #b9831c;text-decoration:none;margin:0 0 16px">Ouvrir Goal Master</a>
</td></tr>
<tr><td style="padding:16px 22px 18px;border-top:3px solid #2e2958;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:#a39dcc">${why} <a href="${settings}" style="color:#a39dcc">Régler mes notifications</a></td></tr>
</table></td></tr></table></body></html>`,
  };
}

export function loginCodeMail(to: string, code: string): Mail {
  return {
    to,
    subject: `${code} : ton code Goal Master`,
    text: `Ton code de connexion Goal Master : ${code}\n\nIl reste valable 10 minutes.`,
    html: `<div style="font-family:system-ui,sans-serif;padding:24px;background:#16132a;color:#f1ecff">
<p style="margin:0 0 12px">Ton code de connexion Goal Master :</p>
<p style="font-size:32px;letter-spacing:8px;font-weight:700;color:#f2c14e;margin:0 0 12px">${code}</p>
<p style="margin:0;color:#a39dcc">Il reste valable 10 minutes.</p></div>`,
  };
}
