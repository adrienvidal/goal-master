// Page d'essai locale qui joue le rôle de job-finder pour l'encart Goal Master (cadrage encart-job-finder).
// Le mode de l'encart (normal, small, free) se choisit par les boutons de la page ou par ?mode= dans l'adresse.
// Usage : node scripts/essai-job-finder.mjs [adresse de Goal Master, défaut http://localhost:3000] [port, défaut 5199]
// Comme le fera job-finder : la clé est gardée par ce serveur local, l'envoi part du serveur, l'iframe ne fait qu'afficher.
import { createServer } from "node:http";

const GM = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const PORT = Number(process.argv[3] ?? 5199);
const ORIGIN = `http://localhost:${PORT}`;
let key = null;
let ref = 1;

const page = () => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Essai job-finder</title>
<style>
  body { font: 14px system-ui, sans-serif; margin: 0; background: #e4e7ee; color: #1b2236; }
  header { background: #16295a; color: #fff; border-bottom: 3px solid #c8202f; padding: 12px 16px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; }
  main { padding: 16px; display: flex; flex-direction: column; gap: 10px; max-width: 640px; padding-bottom: 200px; }
  .row { display: flex; gap: 8px; align-items: center; background: #fdfcf8; padding: 10px; border: 1px solid #d3d7e0; }
  .row span { flex: 1; } button { font: inherit; padding: 6px 10px; border-radius: 3px; border: 0; background: #16295a; color: #fff; cursor: pointer; }
  #dock { position: fixed; right: 16px; bottom: 16px; width: 260px; }
  #dock iframe { border: 0; display: block; background: transparent; }
  #dock.normal iframe { width: 260px; height: 130px; }
  #dock.small { width: 130px; } #dock.small iframe { width: 130px; height: 50px; }
  /* Libre : l'iframe couvre toute la page et laisse passer les clics, comme le fera job-finder */
  #dock.free { inset: 0; width: auto; pointer-events: none; } #dock.free iframe { width: 100%; height: 100%; }
  #dock.free .unlinked { position: fixed; right: 16px; bottom: 16px; width: 260px; pointer-events: auto; }
  .modes { display: flex; gap: 6px; } .modes button.on { background: #c8202f; }
  .unlinked { background: #16132a; color: #f1ecff; border: 3px solid #4a4380; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .unlinked button { background: #f2c14e; color: #1a1626; }
  #log { font: 12px ui-monospace, monospace; color: #566079; white-space: pre-wrap; }
</style>
<header>Essai job-finder</header>
<main>
  <p>Goal Master visé : <code>${GM}</code>. Clé : <b id="k">${key ? "présente" : "aucune"}</b>.</p>
  <div class="modes">${["normal", "small", "free"].map((m) => `<button data-mode="${m}">${m}</button>`).join("")}</div>
  ${["Alan", "Pennylane", "Doctolib", "Qonto", "Back Market"].map((c) => `<div class="row"><span>${c}</span><button data-company="${c}">Marquer envoyée</button></div>`).join("")}
  <div id="log"></div>
</main>
<div id="dock"></div>
<script>
const GM = ${JSON.stringify(GM)};
const dock = document.getElementById("dock"), log = (t) => (document.getElementById("log").textContent = t + "\\n" + document.getElementById("log").textContent);
let linked = ${key ? "true" : "false"}, frame = null, mode = ["normal", "small", "free"].includes(new URLSearchParams(location.search).get("mode")) ? new URLSearchParams(location.search).get("mode") : "normal";
function setMode(m) {
  mode = m; dock.className = m;
  document.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === m));
  if (frame) showWidget();
}
document.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));
function showUnlinked(text) {
  linked = false; frame = null;
  dock.innerHTML = '<div class="unlinked"><b>GOAL MASTER</b><span>' + text + '</span><button id="link">Relier à Goal Master</button></div>';
  document.getElementById("link").onclick = () => window.open(GM + "/relier?origin=" + encodeURIComponent(location.origin), "goal-master-relier", "width=420,height=640");
}
function showWidget() {
  dock.innerHTML = '<iframe title="Goal Master" src="' + GM + '/widget?mode=' + mode + '"></iframe>';
  frame = dock.querySelector("iframe");
}
window.addEventListener("message", async (e) => {
  if (e.origin !== GM) return;
  if (e.data?.type === "goal-master:key") {
    await fetch("/cle", { method: "POST", body: e.data.key });
    document.getElementById("k").textContent = "présente"; log("clé reçue"); showWidget();
  } else if (e.data?.type === "goal-master:ready" && e.source === frame?.contentWindow) {
    const { key } = await (await fetch("/cle")).json();
    frame.contentWindow.postMessage({ type: "goal-master:key", key }, GM);
  } else if (e.data?.type === "goal-master:unlinked") {
    await fetch("/cle", { method: "DELETE" }); showUnlinked("Le lien a été coupé depuis Goal Master.");
  }
});
document.querySelectorAll("[data-company]").forEach((b) => b.onclick = async () => {
  const r = await fetch("/envoyer", { method: "POST", body: b.dataset.company });
  log(b.dataset.company + " → " + r.status + " " + (await r.text()).slice(0, 80));
  if (r.status === 401) showUnlinked("Le lien a été coupé depuis Goal Master.");
  frame?.contentWindow.postMessage({ type: "goal-master:refresh" }, GM);
});
setMode(mode);
linked ? showWidget() : showUnlinked("Relie ton compte pour que tes candidatures envoyées comptent.");
</script>`;

createServer(async (req, res) => {
  const body = await new Promise((ok) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => ok(b)); });
  if (req.url === "/cle" && req.method === "POST") { key = body; return res.end("ok"); }
  if (req.url === "/cle" && req.method === "DELETE") { key = null; return res.end("ok"); }
  if (req.url === "/cle") { res.setHeader("content-type", "application/json"); return res.end(JSON.stringify({ key })); }
  if (req.url === "/envoyer") {
    if (!key) { res.statusCode = 401; return res.end("pas de clé"); }
    const r = await fetch(`${GM}/api/widget/applications`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ company: body, ref: `essai-${Date.now()}-${ref++}`, sentAt: new Date().toISOString() }),
    });
    if (r.status === 401) key = null;
    res.statusCode = r.status;
    return res.end(await r.text());
  }
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(page());
}).listen(PORT, () => console.log(`Essai job-finder : ${ORIGIN} → ${GM}`));
