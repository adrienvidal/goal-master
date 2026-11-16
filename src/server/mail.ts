// E-mails envoyés depuis contact@viloris.io par le SMTP de Google Workspace (SMTP_USER, SMTP_PASS : mot de
// passe d'application). En développement sans SMTP_PASS, le message s'affiche dans le terminal.
import nodemailer from "nodemailer";

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
