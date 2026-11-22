// Guided demo: walks through one day at the restaurant, highlights each feature,
// performs the actions live and reads everything out loud.
import { ChevronLeft, ChevronRight, Loader2, Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CommandBox } from "../components/CommandBox";
import type { View } from "../components/ui";
import type { KitchenState } from "../data/types";
import { interpret } from "../lib/commands";
import { isSoundOn, onSoundChange, setSoundOn, speak, stopSpeaking, voiceEngine } from "../lib/speak";
import { playExchange, runCommand } from "../lib/voiceDemo";
import { useKitchen } from "../state/kitchen";
import { DemoContext } from "./context";
import { steps } from "./steps";
import type { Step, TourCtx } from "./steps";

const ABORT = Symbol("abort");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const readTime = (s: Step) => Math.min(8000, Math.max(3800, (s.title.length + s.body.length) * 42));

function Spotlight({ targets, stepKey }: { targets?: string[]; stepKey: number }) {
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const key = targets?.join("|") ?? "";

  useEffect(() => {
    if (!key) return;
    const sels = key.split("|");
    let raf = 0;
    let stable = 0;
    let lastTop = Number.NaN;
    let scrolled = false;
    const tick = () => {
      const els = sels.flatMap((s) => Array.from(document.querySelectorAll<HTMLElement>(s)));
      if (els.length) {
        // Once the page has settled, centre the highlight in the space above the coach card.
        const firstTop = els[0].getBoundingClientRect().top;
        stable = Math.abs(firstTop - lastTop) < 0.5 ? stable + 1 : 0;
        lastTop = firstTop;
        if (!scrolled && stable > 4) {
          scrolled = true;
          const rs0 = els.map((e) => e.getBoundingClientRect());
          const top = Math.min(...rs0.map((r) => r.top));
          const height = Math.max(...rs0.map((r) => r.bottom)) - top;
          const avail = window.innerHeight - 330;
          const offset = top - Math.max(24, (avail - height) / 2);
          const main = document.querySelector<HTMLElement>(".main");
          const scroller = main && main.scrollHeight > main.clientHeight + 1 && getComputedStyle(main).overflowY !== "visible" ? main : (document.scrollingElement as HTMLElement);
          scroller.scrollTo({ top: Math.max(0, scroller.scrollTop + offset), behavior: "smooth" });
        }
        const rs = els.map((e) => e.getBoundingClientRect());
        const x = Math.min(...rs.map((r) => r.left)) - 10;
        const y = Math.min(...rs.map((r) => r.top)) - 10;
        const w = Math.max(...rs.map((r) => r.right)) - x + 10;
        const h = Math.max(...rs.map((r) => r.bottom)) - y + 10;
        setRect((p) => (p && Math.abs(p.x - x) < 0.5 && Math.abs(p.y - y) < 0.5 && Math.abs(p.w - w) < 0.5 && Math.abs(p.h - h) < 0.5 ? p : { x, y, w, h }));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key, stepKey]);

  if (!key || !rect) return <div className="tour-dim" />;
  return <div className="tour-ring" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} />;
}

export function DemoTour({ navigate, children }: { navigate: (v: View) => void; children: ReactNode }) {
  const { state, actions } = useKitchen();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [startState, setStartState] = useState<KitchenState>(state);
  const [sound, setSound] = useState(isSoundOn());
  const [engine, setEngine] = useState(voiceEngine());
  const token = useRef(0);

  useEffect(() => onSoundChange(() => {
    setSound(isSoundOn());
    setEngine(voiceEngine());
  }), []);

  const makeCtx = useCallback((fast: boolean, tok: number): TourCtx => {
    const alive = () => token.current === tok;
    const wait = async (ms: number) => {
      if (!fast) await sleep(ms);
      if (!alive()) throw ABORT;
    };
    return {
      actions,
      fast,
      wait,
      say: async (line, run) => {
        if (fast) {
          run();
          return;
        }
        await playExchange(actions, line, run, alive);
        if (!alive()) throw ABORT;
      },
      command: async (text) => {
        if (fast) {
          interpret(text, actions);
          return;
        }
        await runCommand(actions, text);
        if (!alive()) throw ABORT;
      },
    };
  }, [actions]);

  /** Show step i. With replay, rebuild the day from scratch up to i (used for Back and jumps). */
  const goTo = useCallback(async (i: number, replay = false) => {
    const tok = ++token.current;
    stopSpeaking();
    setTried(false);
    if (replay) {
      for (let k = 0; k < i; k++) {
        const st = steps[k];
        try {
          await st.run?.(makeCtx(true, tok));
          if (st.waitFor && st.doIt && !st.waitFor(actions.snapshot(), actions.snapshot(), false)) await st.doIt.run(makeCtx(true, tok));
        } catch (e) {
          if (e === ABORT) return;
          console.error(e);
        }
      }
      actions.clearToasts();
    }
    if (token.current !== tok) return;
    const st = steps[i];
    setIndex(i);
    navigate(st.view);
    setStartState(actions.snapshot());
    setBusy(true);
    try {
      if (isSoundOn()) {
        await speak(`${st.title}. ${st.body}`, "narrator");
        if (token.current !== tok) return;
      }
      await st.run?.(makeCtx(false, tok));
    } catch (e) {
      if (e !== ABORT) console.error(e);
      return;
    }
    if (token.current === tok) setBusy(false);
  }, [actions, makeCtx, navigate]);

  const start = useCallback((autoplay = false) => {
    setActive(true);
    setAuto(autoplay);
    void goTo(0);
  }, [goTo]);

  const stop = useCallback(() => {
    token.current++;
    stopSpeaking();
    setActive(false);
    setBusy(false);
  }, []);

  const last = steps.length - 1;
  const step = steps[index];
  const satisfied = !step.waitFor || step.waitFor(state, startState, tried);

  const next = useCallback(() => {
    if (index >= last) return stop();
    void goTo(index + 1, busy); // skipping mid-step replays so the day stays consistent
  }, [busy, goTo, index, last, stop]);
  const back = useCallback(() => {
    if (index > 0) void goTo(index - 1, true);
  }, [goTo, index]);

  const doIt = useCallback(async () => {
    if (!step.doIt) return;
    const tok = token.current;
    try {
      await step.doIt.run(makeCtx(false, tok));
    } catch {
      /* moved on */
    }
    if (step.commandBox) setTried(true);
  }, [makeCtx, step]);

  // Autoplay: perform "do it for me" steps, then move on after a beat.
  useEffect(() => {
    if (!active || !auto || busy || index >= last) return;
    const t = window.setTimeout(() => {
      if (!satisfied && step.doIt) void doIt();
      else void goTo(index + 1);
    }, satisfied ? (isSoundOn() ? 1500 : readTime(step)) : 2200);
    return () => window.clearTimeout(t);
  }, [active, auto, busy, doIt, goTo, index, last, satisfied, step]);

  // Keyboard: → next, ← back, Esc exit.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
      else if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, back, next, stop]);

  useEffect(() => {
    document.body.classList.toggle("demo-on", active);
  }, [active]);

  // ?demo starts the tour on load; ?demo=auto also turns on autoplay.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const p = new URLSearchParams(window.location.search);
    if (!p.has("demo")) return;
    const t = window.setTimeout(() => start(p.get("demo") === "auto"), 300);
    return () => window.clearTimeout(t);
  }, [start]);

  const api = useMemo(() => ({ active, start, stop }), [active, start, stop]);

  return (
    <DemoContext.Provider value={api}>
      {children}
      {active && (
        <>
          <Spotlight targets={step.target} stepKey={index} />
          <div className="tour-card" role="dialog" aria-label="Demo tour">
            <div className="tour-top">
              <span className="tour-chapter">{step.chapter}</span>
              <span className="tour-count num">{index + 1} / {steps.length}</span>
              <div className="tour-tools">
                <button onClick={() => setSoundOn(!sound)} aria-label={sound ? "Mute voice" : "Turn voice on"} title={sound ? `Voice on · ${engine}` : "Voice off"}>
                  {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
                </button>
                <button className={auto ? "on" : ""} onClick={() => setAuto((a) => !a)} aria-label={auto ? "Pause autoplay" : "Autoplay"}>
                  {auto ? <Pause size={15} /> : <Play size={15} />} Auto
                </button>
                <button onClick={stop} aria-label="Exit demo"><X size={18} /></button>
              </div>
            </div>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
            {step.commandBox && <CommandBox dark examples={6} onDone={() => setTried(true)} />}
            <div className="tour-foot">
              <div className="tour-dots">
                {steps.map((s, i) => (
                  <button key={i} className={i === index ? "on" : i < index ? "done" : ""} onClick={() => void goTo(i, i !== index + 1)} aria-label={`Step ${i + 1}: ${s.title}`} title={s.title} />
                ))}
              </div>
              <span className="tour-voice">{sound ? engine : "Muted"}</span>
              {!satisfied && step.doIt && <button className="btn sm yellow" onClick={() => void doIt()}>{step.doIt.label}</button>}
              <button className="btn sm darkghost" onClick={back} disabled={index === 0} aria-label="Back"><ChevronLeft size={18} /></button>
              {index === last ? (
                <>
                  <button className="btn sm darkghost" onClick={() => void goTo(0)}><RotateCcw size={15} /> Restart</button>
                  <button className="btn sm primary" onClick={stop}>Finish</button>
                </>
              ) : (
                <button className="btn sm primary" onClick={next}>
                  {busy ? <><Loader2 size={15} className="spin" /> Skip</> : <>Next <ChevronRight size={17} /></>}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </DemoContext.Provider>
  );
}
