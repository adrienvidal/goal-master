// E-mails envoyés depuis contact@viloris.io par le SMTP de Google Workspace (SMTP_USER, SMTP_PASS : mot de
// passe d'application). En développement sans SMTP_PASS, le message s'affiche dans le terminal.
import nodemailer from "nodemailer";
import { CATEGORY_INFO, type Category, type NotificationText } from "@/game/notifications";

export type Mail = { to: string; subject: string; text: string; html: string };

export async function sendMail(mail: Mail): Promise<void> {
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

/**
 * Gabarit 8 bits des notifications (maquette notifications, section E-mail) : fond nuit, cadre épais, bandeau et scène
 * en PNG pixel art, titres en police pixel là où le client la charge (Courier ailleurs), bouton à relief en bordures.
 */
export function notificationMail(to: string, text: NotificationText, category: Category, scene: MailScene | null = null): Mail {
  const base = (process.env.BETTER_AUTH_URL ?? "https://goal.viloris.io").replace(/\/$/, "");
  const link = `${base}${text.url}`;
  const settings = `${base}/reglages#notifications`;
  const why = `Tu reçois cet e-mail parce que la catégorie ${CATEGORY_INFO[category].label} est activée.`;
  const sceneHtml = scene
    ? `<tr><td align="center" style="background:#221e40;border-bottom:3px dotted #2e2958;padding:20px 12px 0"><img src="${base}/api/email/scene?s=${encodeURIComponent(scene.query)}" width="${scene.width}" height="${scene.height}" alt="${escapeHtml(text.headline)}" style="display:block;max-width:100%;height:auto;image-rendering:pixelated;border:0"></td></tr>`
    : "";
  return {
    to,
    subject: text.headline,
    text: `${text.headline}\n\n${text.detail}\n\nOuvrir Goal Master : ${link}\n\n${why}\nRégler mes notifications : ${settings}`,
    html: `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark">
<style>@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');</style></head>
<body style="margin:0;padding:0;background:#0e0c1d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0c1d"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#16132a;border:4px solid #4a4380">
<tr><td style="border-bottom:4px solid #4a4380;line-height:0"><a href="${link}"><img src="${base}/api/email/header" width="552" alt="Goal Master" style="display:block;width:100%;height:auto;image-rendering:pixelated;border:0"></a></td></tr>
${sceneHtml}
<tr><td style="padding:20px 22px 6px;font-family:${BODY_FONT};color:#f1ecff">
<h1 style="margin:0 0 12px;font-family:${PIXEL_FONT};font-size:15px;line-height:1.7;font-weight:700;color:#f2c14e">${escapeHtml(text.headline)}</h1>
<p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#f1ecff">${escapeHtml(text.detail)}</p>
<a href="${link}" style="display:inline-block;font-family:${PIXEL_FONT};font-size:12px;line-height:1.4;font-weight:700;color:#1a1626;background:#f2c14e;padding:13px 16px;border-right:4px solid #b9831c;border-bottom:4px solid #b9831c;text-decoration:none">Ouvrir Goal Master</a>
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
