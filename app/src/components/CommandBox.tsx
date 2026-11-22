import { Loader2, Mic, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EXAMPLES } from "../lib/commands";
import { stopSpeaking } from "../lib/speak";
import { runCommand } from "../lib/voiceDemo";
import { useKitchen } from "../state/kitchen";

// Minimal typing for the Web Speech API (Chrome / Safari / Edge).
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
const SpeechRec = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition })
  .SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;

/** Say or type a kitchen command; the Manager acts on it and answers out loud. */
export function CommandBox({ dark = false, examples = 4, onDone }: { dark?: boolean; examples?: number; onDone?: (reply: string) => void }) {
  const { state, actions } = useKitchen();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState("");
  const rec = useRef<Recognition | null>(null);
  const { phase, said, reply } = state.voice;

  useEffect(() => () => rec.current?.stop(), []);

  const submit = async (value: string) => {
    const v = value.trim();
    if (!v || busy) return;
    setBusy(true);
    setText("");
    const r = await runCommand(actions, v);
    setBusy(false);
    onDone?.(r);
  };

  const listen = () => {
    if (!SpeechRec) {
      actions.toast("Voice input isn't supported in this browser. Type the command instead.");
      return;
    }
    if (listening) {
      rec.current?.stop();
      return;
    }
    stopSpeaking();
    const r = new SpeechRec();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";
    r.onresult = (e) => {
      const parts = Array.from(e.results);
      finalText = parts.map((p) => p[0].transcript).join(" ").replace(/\s+/g, " ").trim();
      setText(finalText);
      setPreview(finalText);
      actions.voiceInterim(finalText);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") actions.toast("Microphone blocked. Allow it, or type the command.");
      else if (e.error !== "no-speech" && e.error !== "aborted") actions.toast("Couldn't hear that. Try again or type it.");
    };
    r.onend = () => {
      setListening(false);
      setPreview("");
      actions.voiceInterim("");
      if (finalText.trim()) submit(finalText);
    };
    rec.current = r;
    setListening(true);
    r.start();
  };

  return (
    <div className={`cmd ${dark ? "dark" : ""}`}>
      <form
        className="cmd-bar"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
      >
        <button type="button" className={`cmd-mic ${listening ? "on" : ""}`} onClick={listen} aria-label={listening ? "Stop listening" : "Say a command"} title="Say a command">
          <Mic size={19} strokeWidth={2.3} />
        </button>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={listening ? "Listening…" : "Say or type: “buy the eggs now”"} aria-label="Kitchen command" />
        <button className="cmd-send" disabled={!text.trim() || busy} aria-label="Send command">
          {busy ? <Loader2 size={18} className="spin" /> : <Send size={17} strokeWidth={2.3} />}
        </button>
      </form>
      {listening && (
        <div className="cmd-live" aria-live="polite">
          <span className="cmd-live-dot" />
          <span>{preview ? `“${preview}”` : "Listening… start talking"}</span>
          {preview && <span className="caret" />}
        </div>
      )}
      {!listening && said && phase !== "idle" && (
        <div className="cmd-chat">
          <div className="bubble you">“{said}”</div>
          {phase === "done" ? <div className="bubble agent">{reply}</div> : <div className="bubble agent typing"><i /><i /><i /></div>}
        </div>
      )}
      <div className="cmd-examples">
        {EXAMPLES.slice(0, examples).map((ex) => (
          <button key={ex} type="button" onClick={() => submit(ex)} disabled={busy}>{ex}</button>
        ))}
      </div>
    </div>
  );
}
