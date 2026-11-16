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

/** Gabarit unique des notifications (maquette notifications, section E-mail) : pas de police pixel, elle ne se charge pas partout. */
export function notificationMail(to: string, text: NotificationText, category: Category): Mail {
  const base = (process.env.BETTER_AUTH_URL ?? "https://goal.viloris.io").replace(/\/$/, "");
  const link = `${base}${text.url}`;
  const settings = `${base}/reglages#notifications`;
  const why = `Tu reçois cet e-mail parce que la catégorie ${CATEGORY_INFO[category].label} est activée.`;
  return {
    to,
    subject: text.headline,
    text: `${text.headline}\n\n${text.detail}\n\nOuvrir Goal Master : ${link}\n\n${why}\nRégler mes notifications : ${settings}`,
    html: `<div style="background:#eceaf4;padding:24px 12px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:6px;overflow:hidden;color:#1d1a2e">
<div style="background:#16132a;padding:16px 20px;color:#f2c14e;font-weight:700;letter-spacing:2px;font-size:13px">⚔ GOAL MASTER</div>
<div style="padding:22px 20px 8px">
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3">${escapeHtml(text.headline)}</h1>
<p style="margin:0 0 18px;font-size:15px;line-height:1.55">${escapeHtml(text.detail)}</p>
<a href="${link}" style="display:inline-block;background:#f2c14e;color:#1a1626;font-weight:700;padding:12px 18px;border-radius:4px;text-decoration:none">Ouvrir Goal Master</a>
</div>
<div style="padding:16px 20px 20px;margin-top:14px;border-top:1px solid #eceaf4;font-size:12px;line-height:1.5;color:#6b6785">${why} <a href="${settings}" style="color:#6b6785">Régler mes notifications</a></div>
</div></div>`,
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
