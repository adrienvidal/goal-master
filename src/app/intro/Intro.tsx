"use client";
import { useState } from "react";
import { SubmitButton } from "@/components/LinkButton";
import { BossSprite } from "@/components/BossSprite";
import { ChestSprite, Companion } from "@/components/Companion";
import { EyeIcon } from "@/components/DecorView";
import { Sprite } from "@/components/Sprite";
import { finishIntro } from "./actions";

type Step = { title: string; text: string; stage: React.ReactNode };

const STEPS: Step[] = [
  {
    title: "100 candidatures. Deux héros.",
    text: "Ton binôme et toi partez en quête. Chaque candidature envoyée fait grandir ton héros, du bébé au chevalier légendaire.",
    stage: <Sprite character="KNIGHT" color="BLUE" form={1} mood="sleep" px={9} label="Bébé chevalier endormi" />,
  },
  {
    title: "Un clic, une entreprise.",
    text: "Tape « + Candidature », écris chez qui, c'est tout. +10 XP à chaque fois, jusqu'à 15 par jour.",
    stage: (
      <div className="intro-loop flex flex-col items-center gap-4">
        <span className="intro-pop font-display text-sm text-gold">+10 XP</span>
        <span className="intro-swap">
          <span className="intro-rest"><Sprite character="KNIGHT" color="BLUE" form={3} px={7} label="Écuyer" /></span>
          <span className="intro-act"><Sprite character="KNIGHT" color="BLUE" form={3} pose="action" px={7} /></span>
        </span>
        <span className="intro-xp w-56 max-w-full"><i /></span>
        <span className="intro-press font-display">+ CANDIDATURE · DOCTOLIB</span>
      </div>
    ),
  },
  {
    title: "Vers 75 candidatures, tu seras légendaire.",
    text: "Ton héros change de forme aux niveaux 4, 8, 12, 16 et 20. Termine tes 100 candidatures en armure dorée.",
    stage: (
      <div className="flex flex-col items-center gap-4">
        <span className="intro-evo-names font-display text-[11px] text-gold" aria-hidden="true">
          <span>Bébé · 0</span><span>Écuyer · ~20</span><span>Chevalier · ~54</span><span>Légendaire · ~75</span>
        </span>
        <span className="intro-evo" role="img" aria-label="Évolution du bébé au chevalier légendaire">
          {([1, 3, 5, 6] as const).map((f) => (
            <span key={f}><Sprite character="KNIGHT" color="BLUE" form={f} pose={f === 6 ? "victory" : "rest"} px={6} /></span>
          ))}
        </span>
      </div>
    ),
  },
  {
    title: "Laisse-le dormir, son armure rouille.",
    text: "Deux jours sans candidature et l'avatar s'endort, quatre et il rouille. Motive ton binôme : s'il candidate dans les 24 h, +15 XP pour vous deux.",
    stage: (
      <div className="flex items-end justify-center gap-8">
        <figure className="m-0 flex flex-col items-center gap-2 text-sm">
          <Sprite character="KNIGHT" color="BLUE" form={4} px={4} label="Ton héros" />
          <figcaption>Toi</figcaption>
        </figure>
        <figure className="m-0 flex flex-col items-center gap-2 text-center text-sm">
          <Sprite character="PANDA" color="RED" form={3} mood="tired" px={4} label="Le héros du binôme, fatigué" />
          <figcaption>Ton binôme<br /><span className="text-xs text-danger">Le bambou se fend</span></figcaption>
          <span className="btn blink !w-auto !px-3 !py-2 !text-[9px]" aria-hidden="true">⚔ MOTIVER</span>
        </figure>
      </div>
    ),
  },
  {
    title: "Chaque vendredi, un boss.",
    text: "Vous l'affrontez à deux, le vendredi à 18 h. Chaque candidature de la semaine lui porte un coup, et ton niveau ajoute un coup de grâce. Perdu ? Vos héros portent un bandage jusqu'à la victoire suivante, et c'est tout.",
    stage: (
      <div className="flex flex-col items-center gap-4">
        <span className="font-display text-[10px] text-[#c9b8ff]">Le Recruteur fantôme</span>
        <span className="intro-hp w-56 max-w-full"><i /></span>
        <div className="flex items-end justify-center gap-6">
          <span className="intro-swap">
            <span className="intro-rest"><Sprite character="KNIGHT" color="BLUE" form={3} px={5} label="Ton héros" /></span>
            <span className="intro-act"><Sprite character="KNIGHT" color="BLUE" form={3} pose="action" px={5} /></span>
          </span>
          <span className="boss-float"><BossSprite boss={0} px={5} /></span>
          <Sprite character="PANDA" color="RED" form={3} px={5} label="Le héros du binôme" />
        </div>
      </div>
    ),
  },
  {
    title: "Regarde-les vivre.",
    text: "Touche l'œil en haut à droite de la carte : elle s'efface, et vos héros se promènent dans le paysage. Touche l'écran pour la faire revenir.",
    stage: (
      <div className="intro-decor" role="img" aria-label="L'œil masque la carte, les héros se promènent">
        <div className="intro-decor-card">
          <span className="intro-decor-eye"><EyeIcon /></span>
          <i /><i /><i />
        </div>
        <div className="intro-decor-heroes">
          <span className="intro-decor-walk"><Sprite character="KNIGHT" color="BLUE" form={3} px={4} /></span>
          <span className="intro-decor-walk is-late"><Sprite character="PANDA" color="RED" form={3} px={4} /></span>
        </div>
      </div>
    ),
  },
  {
    title: "Défie ton binôme.",
    text: "Sur sa carte, touche « Défier » : 3, 5 ou 10 candidatures, avant ce soir minuit ou vendredi 18 h. S'il relève le défi, c'est la course. Le premier arrivé porte la couronne jusqu'au lendemain soir. Toutes les candidatures comptent aussi pour l'XP et pour le boss.",
    stage: (
      <div className="flex items-end justify-center gap-6">
        <Sprite character="KNIGHT" color="BLUE" form={3} px={5} label="Ton héros" />
        <Sprite character="PANDA" color="RED" form={3} pose="victory" crown px={5} label="Le héros du binôme, couronné" />
      </div>
    ),
  },
  {
    title: "Entre dans l'Arène.",
    text: "Sur la carte de ton binôme, touche « Arène » pour le provoquer. Chaque tour te donne 3 PA, et ceux que tu gardes s'ajoutent : attaque, parade, potion ou Botte secrète. Tu joues tant qu'il te reste des PA. Celui qui répond à la provocation part avec 1 PA de plus. Une Parade qui encaisse un coup te rend 1 PA. Premier K.O. perdu, sinon le plus de PV vendredi 18 h. Le gagnant porte la couronne. Un jeu à part : aucune XP en jeu, tes candidatures n'y changent rien.",
    stage: (
      <div className="flex items-end justify-center gap-6">
        <Sprite character="KNIGHT" color="BLUE" form={3} pose="action" px={5} label="Ton héros attaque" />
        <span className="arena-body flip"><Sprite character="PANDA" color="RED" form={3} pose="parry" px={5} label="Le héros du binôme pare" /></span>
      </div>
    ),
  },
  {
    title: "Lance une quête.",
    text: "Lance une quête à ton binôme : un post LinkedIn, un café avec un ancien collègue. Quand tu la valides, ton binôme ouvre un coffre et adopte un compagnon parmi trois. +20 XP pour ton binôme, +5 XP pour toi.",
    stage: (
      <div className="flex items-end justify-center gap-3">
        <Sprite character="KNIGHT" color="BLUE" form={3} pose="victory" px={5} label="Ton héros" />
        <Companion id="fox" px={4} joy />
        <ChestSprite px={4} />
      </div>
    ),
  },
];

// Intro du premier lancement (maquettes validées) : 9 écrans, « Passer » à tout moment.
export default function Intro({ start = 0 }: { start?: number }): React.ReactElement {
  const [i, setI] = useState(start);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <main className="mx-auto grid min-h-dvh max-w-5xl content-center gap-6 px-4 py-6 md:grid-cols-2 md:items-center md:gap-10">
      <div className="flex items-center justify-between md:col-span-2">
        <div className="flex gap-1.5" aria-label={`Étape ${i + 1} sur ${STEPS.length}`}>
          {STEPS.map((_, k) => (
            <i key={k} className={`size-2.5 border-2 ${k === i ? "border-[#b9831c] bg-gold" : "border-edge bg-stone-2"}`} />
          ))}
        </div>
        <form action={finishIntro}>
          <button type="submit" className="text-sm text-muted underline">Passer</button>
        </form>
      </div>
      <div key={i} className="device grid min-h-[280px] place-items-end justify-center !bg-night !pb-8 md:min-h-[380px]">{step.stage}</div>
      <div className="flex flex-col gap-4">
        <div className="device flex flex-col gap-3" aria-live="polite">
          {start > 0 && i >= start ? <span className="font-display text-[9px] text-ember">Nouveau</span> : null}
          <h1 className="h-title text-gold text-balance">{step.title}</h1>
          <p className="text-[16px]">{step.text}</p>
        </div>
        {last ? (
          <form action={finishIntro}>
            <SubmitButton className="btn">Commencer la quête</SubmitButton>
          </form>
        ) : (
          <button type="button" className="btn" onClick={() => setI(i + 1)}>Suivant</button>
        )}
        {i > start ? <button type="button" className="text-sm text-muted underline" onClick={() => setI(i - 1)}>Retour</button> : null}
      </div>
    </main>
  );
}
