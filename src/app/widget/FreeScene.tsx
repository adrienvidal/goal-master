"use client";
import { useEffect, useRef } from "react";
import { Companion, Pixels } from "@/components/Companion";
import { Sprite } from "@/components/Sprite";
import type { CompanionId } from "@/game/quests";
import { between, bubbleAlign, FIRST_MONSTER_S, friendBubble, friendHello, heroBubble, MONSTER_DELAY_S, MONSTER_HP, nextMonster, nextVisitor, pickGesture, pickThought, STAY_S, STRIKE_S, THOUGHT_DELAY_S, THOUGHT_MS, thoughts, visitDelay, type Gesture, type Range, type Visitor } from "@/lib/freeScene";
import { isLocalOrigin } from "@/lib/localOrigin";
import { FLYING, MONSTER_GRIDS, MONSTER_IDS, MONSTER_PAL, type MonsterId } from "@/lib/monsters";
import { victoryPop, type Victory } from "@/lib/widgetVictory";
import type { WidgetState } from "@/lib/widgetState";

// Mode libre vivant (specs encart-libre-vivant, encart-sans-compagnon) : le héros patrouille et fait sa vie, pense tout haut,
// un compagnon ou le héros de l'ami passe, un monstre arrive. Les échéances sont des heures : elles avancent onglet caché.
// React dessine les sprites une fois ; le moteur ne fait que les placer, les montrer et les cacher (pas de rendu par image).
// L'iframe laisse passer les clics : job-finder reçoit nos boîtes (goal-master:hitboxes) et renvoie le clic (goal-master:poke).

type Target = "hero" | "companion" | "monster";
type Ent = { el: HTMLElement; face: HTMLElement; say: HTMLElement; x: number; dir: 1 | -1 };
type Engine = { victory: () => void; poke: (target: Target) => void; friendApplied: () => void };

const REACH = 34;
const ENGAGE = 220;
const HITBOX_MS = 100;
const BUBBLE_MS = 3_200;
const FRIEND_STRIKE_S = 0.7;
/** Une pensée qui tombe mal (combat, autre bulle) attend un peu. */
const THOUGHT_RETRY_S = 10;

export function FreeScene({ className, state, victory, parentOrigin }: { className: string; state: WidgetState | null; victory: Victory | null; parentOrigin: React.RefObject<string | null> }): React.ReactElement {
  const root = useRef<HTMLDivElement>(null);
  const latest = useRef(state);
  const engine = useRef<Engine | null>(null);
  useEffect(() => {
    latest.current = state;
  }, [state]);
  const ready = state !== null;
  const ids = (state?.companions ?? []).map((c) => c.id).join(",");
  const hasFriend = !!state?.friend;
  // L'ami candidate pendant qu'il est là : son compte du jour monte entre deux lectures.
  const friendToday = useRef<number | null>(null);
  useEffect(() => {
    const today = state?.friend?.today ?? null;
    if (today !== null && friendToday.current !== null && today > friendToday.current) engine.current?.friendApplied();
    friendToday.current = today;
  }, [state]);

  useEffect(() => {
    const box = root.current;
    if (!ready || !box) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const ent = (el: HTMLElement): Ent => ({ el, face: el.querySelector<HTMLElement>(".fs-face")!, say: el.querySelector<HTMLElement>(".fs-say")!, x: 0, dir: 1 });
    const heroEl = box.querySelector<HTMLElement>(".fs-hero");
    if (!heroEl) return;
    const hero = { ...ent(heroEl), pause: 0, cheer: 0, atk: 0, rush: false };
    hero.x = Math.max(60, box.clientWidth * 0.3);
    const comps = new Map<CompanionId, Ent>();
    box.querySelectorAll<HTMLElement>(".fs-comp").forEach((el) => comps.set(el.dataset.id as CompanionId, ent(el)));
    const friendEl = box.querySelector<HTMLElement>(".fs-friend");
    const friend = friendEl ? ent(friendEl) : null;
    const mons = new Map<MonsterId, Ent>();
    box.querySelectorAll<HTMLElement>(".fs-mon").forEach((el) => mons.set(el.dataset.id as MonsterId, ent(el)));

    type Visit = { id: Visitor; e: Ent; state: "come" | "walk" | "follow" | "sit" | "sleep" | "flee" | "fight" | "leave"; t: number; stay: number; atk: number };
    let visit: Visit | null = null;
    let lastVisitor: Visitor | null = null;
    let lastCompanion: CompanionId | null = null;
    type Fight = { id: MonsterId; e: Ent; hp: number; lunge: number; flap: number; alive: boolean };
    let fight: Fight | null = null;
    let lastMonster: MonsterId | null = null;
    let gesture: Gesture | null = null;
    let lastThought: string | null = null;
    const said = new Set<string>();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };
    const still = () => reduced.matches;
    // Essai local seulement : ?vitesse=10 accélère visites, pensées et monstres (jamais en production).
    const speed = process.env.NODE_ENV === "production" ? 1 : Number(new URLSearchParams(location.search).get("vitesse")) || 1;
    // Heures en secondes : performance.now() avance aussi onglet caché, contrairement aux images.
    const clock = () => performance.now() / 1000;
    const after = (range: Range) => clock() + between(range) / speed;
    let visitAt = after(visitDelay(comps.size, true));
    let monsterAt = after(FIRST_MONSTER_S);
    let thoughtAt = after(THOUGHT_DELAY_S);

    // Bulles et marques construites en DOM (jamais d'innerHTML : le nom d'un compagnon vient du joueur).
    function say(e: Ent, nodes: HTMLElement[], ms: number): void {
      e.say.replaceChildren(...nodes);
      e.el.classList.toggle("talking", nodes.length > 0);
      const at = e.say.dataset.at ?? "";
      e.say.dataset.at = String(Number(at) + 1);
      const mine = e.say.dataset.at;
      if (ms) later(() => {
        if (e.say.dataset.at === mine) say(e, [], 0);
      }, ms);
    }
    function node(tag: string, cls: string, text: string): HTMLElement {
      const n = document.createElement(tag);
      n.className = cls;
      n.textContent = text;
      return n;
    }
    function once(e: Ent, cls: string, ms: number): void {
      e.el.classList.remove(cls);
      void e.el.offsetWidth;
      e.el.classList.add(cls);
      later(() => e.el.classList.remove(cls), ms);
    }
    function place(e: Ent, walking: boolean, faceLeftByDefault = false): void {
      e.el.style.left = `${e.x}px`;
      e.face.style.transform = `scaleX(${faceLeftByDefault ? -e.dir : e.dir})`;
      e.el.classList.toggle("walking", walking && !still());
      e.say.dataset.align = bubbleAlign(e.x, box!.clientWidth);
    }

    function arrive(id: Visitor): void {
      const e = id === "friend" ? friend : comps.get(id);
      if (!e) return;
      const fromLeft = hero.x > box!.clientWidth / 2;
      e.x = fromLeft ? -20 : box!.clientWidth + 20;
      e.dir = fromLeft ? 1 : -1;
      e.el.hidden = false;
      // Le héros de l'ami vient d'abord saluer ; un compagnon flâne tout de suite.
      visit = { id, e, state: id === "friend" ? "come" : "walk", t: 2 + Math.random() * 2, stay: between(STAY_S), atk: 0 };
      lastVisitor = id;
      if (id !== "friend") lastCompanion = id;
    }
    function gone(): void {
      if (!visit) return;
      visit.e.el.hidden = true;
      say(visit.e, [], 0);
      visit = null;
      visitAt = after(visitDelay(comps.size, false));
    }
    function bubble(b: { strong: string; rest: string }, cls = ""): HTMLElement {
      const n = node("div", `fs-bubble ${cls}`.trim(), "");
      n.append(node("strong", "", b.strong), document.createTextNode(b.rest));
      return n;
    }
    // Gestes du héros seul, aux pauses de sa patrouille.
    function rest(): void {
      if (!gesture) return;
      hero.el.classList.remove("sit", "stretch");
      if (gesture === "whistle" || gesture === "nap") say(hero, [], 0);
      gesture = null;
    }
    function act(kind: Gesture): void {
      rest();
      gesture = kind;
      if (kind === "sit") {
        hero.el.classList.add("sit");
        hero.pause = 3 + Math.random() * 2;
      } else if (kind === "stretch") {
        once(hero, "stretch", 900);
        hero.pause = 1.4;
      } else if (kind === "whistle") {
        say(hero, [node("span", "fs-music", "♪ ♫")], 0);
        hero.pause = 2.6;
      } else if (kind === "look") {
        hero.dir = hero.dir === 1 ? -1 : 1;
        say(hero, [node("span", "fs-mark", "?")], 1_200);
        hero.pause = 1.6;
      } else {
        hero.el.classList.add("sit");
        say(hero, [node("span", "fs-zzz", "z Z")], 0);
        hero.pause = 9;
      }
    }
    function think(): void {
      const s = latest.current;
      thoughtAt = clock() + THOUGHT_RETRY_S / speed;
      if (!s || fight?.alive || (hero.el.classList.contains("talking") && gesture !== "whistle")) return;
      const t = pickThought(thoughts({ ...s, friend: s.friend ?? null, boss: s.boss ?? null, canNudge: s.canNudge ?? false }, Date.now(), said), lastThought);
      if (!t) return;
      rest();
      if (t.urgent) said.add(t.key);
      lastThought = t.key;
      const n = node("div", "fs-bubble fs-think", t.text);
      say(hero, [n], THOUGHT_MS);
      thoughtAt = after(THOUGHT_DELAY_S);
    }
    function spawn(): void {
      const id = nextMonster(lastMonster);
      const e = mons.get(id);
      if (!e) return;
      lastMonster = id;
      const fromRight = hero.x < box!.clientWidth / 2;
      e.x = fromRight ? box!.clientWidth + 30 : -30;
      e.dir = fromRight ? -1 : 1;
      e.el.hidden = false;
      e.el.classList.remove("poof");
      fight = { id, e, hp: MONSTER_HP, lunge: 1.2, flap: 0, alive: true };
      if (gesture) {
        rest();
        say(hero, [node("span", "fs-mark", "!")], 800);
      }
      // Le compagnon s'écarte ; le héros de l'ami se bat.
      if (visit && visit.state !== "leave") {
        const brave = visit.id === "friend";
        visit.state = brave ? "fight" : "flee";
        say(visit.e, [node("span", brave ? "fs-mark" : "fs-mark fear", "!")], 900);
      }
    }
    function hit(f: Fight, by: Ent): void {
      if (!f.alive) return;
      f.hp -= 1;
      once(by, "strike", 300);
      once(f.e, "hurt", 300);
      const n = node("span", "fs-hit", "-1");
      n.style.left = `${f.e.x}px`;
      box!.appendChild(n);
      later(() => n.remove(), 800);
      if (f.hp > 0) return;
      f.alive = false;
      f.e.el.classList.add("poof");
      hero.rush = false;
      hero.pause = 0.8;
      later(() => {
        f.e.el.hidden = true;
        f.e.el.classList.remove("poof");
        if (fight === f) fight = null;
        monsterAt = after(MONSTER_DELAY_S);
        if (visit?.state === "flee") visit.state = "sit";
        if (visit?.state === "fight") {
          visit.state = "sit";
          visit.t = 1.5;
          if (!still()) {
            once(visit.e, "hop", 450);
            once(hero, "hop", 450);
          }
        }
      }, 650);
    }

    engine.current = {
      victory() {
        rest();
        if (!still()) hero.cheer = 1.8;
        if (visit && !still()) later(() => visit && once(visit.e, "hop", 450), 150);
      },
      friendApplied() {
        if (!visit || visit.id !== "friend" || visit.state === "leave" || still()) return;
        const pop = node("span", "fs-xp", "+10 XP");
        say(visit.e, [pop], 1_800);
        once(visit.e, "jump", 900);
        later(() => once(hero, "hop", 450), 150);
      },
      poke(target) {
        if (target === "hero") {
          const s = latest.current;
          if (!s) return;
          // Une sieste : le clic réveille.
          if (gesture === "nap") {
            rest();
            say(hero, [node("span", "fs-mark", "!")], 900);
            if (!still()) once(hero, "jump", 900);
            hero.pause = 1;
            return;
          }
          rest();
          say(hero, [bubble(heroBubble(s))], BUBBLE_MS);
          if (!still()) {
            hero.cheer = Math.max(hero.cheer, 1.4);
            once(hero, "jump", 900);
          }
        } else if (target === "companion" && visit?.id === "friend") {
          const f = latest.current?.friend;
          if (!f) return;
          say(visit.e, [bubble(friendBubble(f), "fs-friendly")], BUBBLE_MS);
          if (!still()) once(visit.e, "hop", 450);
          if (visit.state !== "leave" && visit.state !== "fight" && visit.state !== "come") {
            visit.state = "sit";
            visit.t = 2.5;
          }
        } else if (target === "companion" && visit) {
          const name = latest.current?.companions.find((c) => c.id === visit!.id)?.name ?? "";
          if (visit.state !== "flee" && visit.state !== "leave") {
            visit.state = "sit";
            visit.t = 2.5;
          }
          say(visit.e, [node("span", "fs-heart", "♥"), node("span", "fs-tag", name)], 2_000);
          if (!still()) once(visit.e, "hop", 450);
        } else if (target === "monster" && fight?.alive) {
          hero.rush = true;
          say(hero, [node("span", "fs-mark", "!")], 800);
        }
      },
    };

    function turn(x: number, dir: 1 | -1): void {
      hero.x = x;
      hero.dir = dir;
      hero.pause = 1.2;
    }

    let last = performance.now();
    let sentAt = 0;
    let sent = "";
    let frame = 0;
    function tick(t: number): void {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const W = box!.clientWidth;
      const min = 24;
      const max = Math.max(min + 10, W - 24);
      if (still()) {
        hero.x = 36;
        hero.dir = 1;
        if (visit) gone();
        if (fight) {
          fight.e.el.hidden = true;
          fight = null;
        }
        place(hero, false);
      } else {
        // Héros : victoire, sinon combat, sinon patrouille.
        let walking = false;
        const f = fight;
        if (hero.cheer > 0) hero.cheer -= dt;
        else if (f?.alive && (hero.rush || Math.abs(f.e.x - hero.x) < ENGAGE)) {
          const d = f.e.x - hero.x;
          hero.dir = d >= 0 ? 1 : -1;
          if (Math.abs(d) > REACH) {
            hero.x += hero.dir * (hero.rush ? 120 : 70) * dt;
            walking = true;
          } else if ((hero.atk -= dt) <= 0) {
            hero.atk = STRIKE_S;
            hit(f, hero);
          }
        } else if (hero.pause > 0) {
          hero.pause -= dt;
          if (hero.pause <= 0) rest();
        } else {
          walking = true;
          hero.x += hero.dir * 36 * dt;
          if (hero.x > max) turn(max, -1);
          else if (hero.x < min) turn(min, 1);
          else if (Math.random() < dt * 0.3) {
            hero.pause = 0.8 + Math.random() * 1.6;
            if (Math.random() < 0.4) hero.dir = hero.dir === 1 ? -1 : 1;
            // Une pause sur deux devient un geste ; la sieste reste rare.
            if (Math.random() < 0.5 && !hero.el.classList.contains("talking")) act(pickGesture());
          }
        }
        place(hero, walking);

        // Monstre : s'approche ; ses charges font juste vaciller le héros.
        if (!f && clock() >= monsterAt) spawn();
        if (fight?.alive) {
          const m = fight;
          const d = hero.x - m.e.x;
          m.e.dir = d >= 0 ? 1 : -1;
          let moving = false;
          if (Math.abs(d) > REACH) {
            m.e.x += m.e.dir * 34 * dt;
            moving = true;
          } else if ((m.lunge -= dt) <= 0) {
            m.lunge = 1.3;
            once(m.e, "lunge", 300);
            once(hero, "shake", 250);
          }
          if (FLYING[m.id]) {
            m.flap += dt;
            if (m.flap > 0.2) {
              m.flap = 0;
              m.e.el.classList.toggle("alt");
            }
            m.e.el.style.bottom = `${Math.abs(d) > REACH ? 70 + Math.sin(t / 250) * 10 : 14}px`;
          }
          place(m.e, moving && !FLYING[m.id]);
        }

        // Visiteur (compagnon ou héros de l'ami) : flâne, suit, s'assoit, dort, fuit ou se bat, puis repart.
        if (!visit && clock() >= visitAt) {
          const next = nextVisitor([...comps.keys()], !!friend, lastVisitor, lastCompanion);
          if (next) arrive(next);
          else visitAt = after(visitDelay(comps.size, false));
        }
        const v = visit;
        if (v) {
          let walking = false;
          if (v.state === "leave") {
            v.e.x += v.e.dir * 30 * dt;
            walking = true;
            if (v.e.x < -30 || v.e.x > W + 30) gone();
          } else if (v.e.x < min || v.e.x > max) {
            v.e.dir = v.e.x < min ? 1 : -1;
            v.e.x += v.e.dir * 30 * dt;
            walking = true;
          } else if (v.state === "fight") {
            const m = fight;
            if (m?.alive) {
              const side = m.e.x + (v.e.x < m.e.x ? -REACH : REACH);
              const d = side - v.e.x;
              if (Math.abs(d) > 4) {
                v.e.dir = d > 0 ? 1 : -1;
                v.e.x += v.e.dir * 90 * dt;
                walking = true;
              } else if ((!FLYING[m.id] || Math.abs(hero.x - m.e.x) <= REACH) && (v.atk -= dt) <= 0) {
                // Une chauve-souris ne se frappe qu'une fois descendue sur le héros.
                v.atk = FRIEND_STRIKE_S;
                v.e.dir = m.e.x >= v.e.x ? 1 : -1;
                hit(m, v.e);
              }
            }
          } else if (v.state === "come" && fight?.alive) {
            // Un monstre est déjà là : il va d'abord aider.
            v.state = "fight";
            say(v.e, [node("span", "fs-mark", "!")], 900);
          } else if (v.state === "come") {
            // Il vient jusqu'au héros ; les deux se saluent, sa bulle dit sa journée.
            const target = hero.x + (v.e.x < hero.x ? -46 : 46);
            const d = target - v.e.x;
            if (Math.abs(d) > 4) {
              v.e.dir = d > 0 ? 1 : -1;
              v.e.x += v.e.dir * 46 * dt;
              walking = true;
            } else {
              v.e.dir = hero.x >= v.e.x ? 1 : -1;
              once(v.e, "wave", 900);
              const f = latest.current?.friend;
              if (f) say(v.e, [bubble(friendHello(f), "fs-friendly")], 3_600);
              if (!fight?.alive) {
                rest();
                hero.pause = Math.max(hero.pause, 2.2);
                hero.dir = v.e.x >= hero.x ? 1 : -1;
                once(hero, "wave", 900);
              }
              v.state = "sit";
              v.t = 3.6;
            }
          } else if (v.state === "flee" && fight) {
            const away = v.e.x < fight.e.x ? -1 : 1;
            v.e.dir = away;
            if ((away < 0 && v.e.x > min) || (away > 0 && v.e.x < max)) {
              v.e.x += away * 70 * dt;
              walking = true;
            }
          } else if ((v.stay -= dt * speed) <= 0) {
            say(v.e, [], 0);
            v.state = "leave";
            v.e.dir = v.e.x < W / 2 ? -1 : 1;
          } else {
            if ((v.t -= dt) <= 0) {
              if (v.state === "sleep") say(v.e, [], 0);
              const r = Math.random();
              // Le héros de l'ami ne fait pas la sieste chez toi.
              const sleepy = v.id === "friend" ? 1 : 0.85;
              v.state = r < 0.35 ? "walk" : r < 0.6 ? "follow" : r < sleepy ? "sit" : "sleep";
              v.t = v.state === "sleep" ? 6 + Math.random() * 4 : 2 + Math.random() * 3;
              if (v.state === "walk") v.e.dir = Math.random() < 0.5 ? 1 : -1;
              if (v.state === "sleep") say(v.e, [node("span", "fs-zzz", "z Z")], 0);
            }
            if (v.state === "walk") {
              v.e.x += v.e.dir * 24 * dt;
              walking = true;
              if (v.e.x > max) {
                v.e.x = max;
                v.e.dir = -1;
              } else if (v.e.x < min) {
                v.e.x = min;
                v.e.dir = 1;
              }
            } else if (v.state === "follow") {
              const d = hero.x - hero.dir * 40 - v.e.x;
              if (Math.abs(d) > 6) {
                v.e.dir = d > 0 ? 1 : -1;
                v.e.x += v.e.dir * 46 * dt;
                walking = true;
              }
            }
            v.e.x = Math.min(max, Math.max(min, v.e.x));
          }
          if (visit) place(v.e, walking, v.id !== "friend");
        }
      }

      // Pensées : aussi en mouvement réduit (une bulle, rien ne bouge).
      if (clock() >= thoughtAt) think();

      // Boîtes cliquables pour job-finder, au plus 10 fois par seconde et seulement si elles changent.
      if (t - sentAt >= HITBOX_MS && parentOrigin.current) {
        sentAt = t;
        const boxes: { target: Target; x: number; y: number; w: number; h: number }[] = [];
        const add = (target: Target, el: HTMLElement) => {
          const r = el.querySelector<HTMLElement>(".fs-face")!.getBoundingClientRect();
          boxes.push({ target, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) });
        };
        add("hero", hero.el);
        if (visit && visit.state !== "leave") add("companion", visit.e.el);
        if (fight?.alive) add("monster", fight.e.el);
        const key = JSON.stringify(boxes);
        if (key !== sent) {
          sent = key;
          window.parent.postMessage({ type: "goal-master:hitboxes", boxes }, parentOrigin.current);
        }
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    function onMessage(event: MessageEvent): void {
      if (event.source !== window.parent || !isLocalOrigin(event.origin)) return;
      const data = event.data as { type?: string; target?: string } | null;
      if (data?.type === "goal-master:poke" && (data.target === "hero" || data.target === "companion" || data.target === "monster")) engine.current?.poke(data.target);
    }
    window.addEventListener("message", onMessage);
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      window.removeEventListener("message", onMessage);
      // L'origine du parent la plus récente, voulue : elle n'est connue qu'après la clé, bien après le montage.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const origin = parentOrigin.current;
      if (origin) window.parent.postMessage({ type: "goal-master:hitboxes", boxes: [] }, origin);
      engine.current = null;
      // Le moteur redémarre quand les compagnons changent : React garde les éléments, on les remet au repos.
      const moved = ["walking", "talking", "poof", "alt", "hop", "hurt", "lunge", "strike", "shake", "jump", "sit", "stretch", "wave"];
      box.querySelectorAll<HTMLElement>(".fs-ent").forEach((el) => {
        el.classList.remove(...moved);
        el.querySelector(".fs-say")?.replaceChildren();
        if (!el.classList.contains("fs-hero")) el.hidden = true;
      });
      box.querySelectorAll(".fs-hit").forEach((n) => n.remove());
    };
  }, [ready, ids, hasFriend, parentOrigin]);

  useEffect(() => {
    if (victory) engine.current?.victory();
  }, [victory]);

  return (
    <div className={className} ref={root}>
      {state && (
        <>
          <div className="fs-ent fs-hero">
            <div className="fs-say" />
            {victory ? <span className="gm-pop">{victoryPop(victory, state, "free")}</span> : state.evolutionPending ? <span className="gm-pop still">!</span> : null}
            <div className="fs-face">
              <div className="fs-bob">
                <span className="gm-hero">
                  <Sprite character={state.character} color={state.color} form={state.displayedForm} mood={victory ? "normal" : state.mood} pose={victory ? "victory" : "rest"} px={state.displayedForm >= 4 ? 2 : 3} />
                </span>
              </div>
            </div>
          </div>
          {state.companions.map((c) => (
            <div key={c.id} className="fs-ent fs-comp" data-id={c.id} hidden>
              <div className="fs-say" />
              <div className="fs-face">
                <div className="fs-bob">
                  <Companion id={c.id} px={2} label={c.name} />
                </div>
              </div>
            </div>
          ))}
          {state.friend && (
            <div className="fs-ent fs-friend" hidden>
              <div className="fs-say" />
              <div className="fs-face">
                <div className="fs-bob">
                  <span className="gm-hero">
                    <Sprite character={state.friend.character} color={state.friend.color} form={state.friend.displayedForm} mood={state.friend.mood} pose="rest" px={state.friend.displayedForm >= 4 ? 2 : 3} />
                  </span>
                </div>
              </div>
            </div>
          )}
          {MONSTER_IDS.map((m) => (
            <div key={m} className={FLYING[m] ? "fs-ent fs-mon fs-fly" : "fs-ent fs-mon"} data-id={m} hidden>
              <div className="fs-say" />
              <div className="fs-face">
                <div className="fs-bob">
                  {MONSTER_GRIDS[m].map((grid, i) => (
                    <span key={i} className={i === 0 ? "fs-frame" : "fs-frame fs-alt"}>
                      <Pixels grid={grid} px={3} palette={MONSTER_PAL} />
                    </span>
                  ))}
                </div>
              </div>
              <i className="fs-smoke" />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
