// Spoken exchanges for demos: the cook's line, the action, then the Manager's reply.
import { interpret } from "./commands";
import type { CommandActions } from "./commands";
import { speak } from "./speak";

type VoiceActions = {
  voiceListen: (said: string) => void;
  voiceReply: (reply: string) => void;
};

/** A scripted line: speak it in the cook's voice, run it, then speak the reply. */
export async function playExchange(
  a: VoiceActions,
  said: string,
  run: () => string,
  alive: () => boolean = () => true,
) {
  a.voiceListen(said);
  const t0 = performance.now();
  await speak(said, "cook");
  if (!alive()) return;
  // Leave a beat even with sound off, so the "listening" state is visible.
  const left = 900 - (performance.now() - t0);
  if (left > 0) await new Promise((r) => setTimeout(r, left));
  if (!alive()) return;
  const reply = run();
  a.voiceReply(reply);
  await speak(reply, "manager");
}

/** Something you said or typed yourself: interpret it and speak the Manager's reply. */
export async function runCommand(a: VoiceActions & CommandActions, text: string) {
  a.voiceListen(text);
  await new Promise((r) => setTimeout(r, 450));
  const reply = interpret(text, a);
  a.voiceReply(reply);
  await speak(reply, "manager");
  return reply;
}
