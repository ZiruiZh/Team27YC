import { useConversation } from "@elevenlabs/react";
import { Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { tryInterpret } from "./lib/commands";
import { stopSpeaking } from "./lib/speak";
import { useKitchen } from "./state/kitchen";

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID || "agent_7701m826461tf5y9qty5ghbjhhqn";

// Sent to the agent when a session starts, so it acts instead of asking.
const HOUSE_RULES =
  "You are the Manager, the voice of this restaurant's kitchen app. The app carries out every " +
  "kitchen request it hears the moment it's said: selling, 86-ing, buying stock, waste, new dishes, " +
  "suppliers, prices, the shopping list, closing the day and approving orders. Never ask for " +
  "confirmation and never ask follow-up questions about a request. When the app tells you what it " +
  "did, confirm it in one short sentence. Keep every reply under two sentences.";

/**
 * Live ElevenLabs voice agent ("the Manager"). Tap to talk.
 *
 * Every final transcript from the user goes through the app's own command interpreter
 * and runs immediately, so requests work without configuring tools in the ElevenLabs
 * dashboard. The agent is told what was done and just confirms it out loud.
 *
 * If the agent also calls one of the client tools below for the same request, the
 * tool sees the request was already handled and returns that result instead of
 * running it twice. kitchen_command({ command }) hands anything else to the interpreter.
 */
export function VoiceManager() {
  const { actions } = useKitchen();
  const last = useRef<{ at: number; reply: string }>({ at: 0, reply: "" });
  const tellAgent = useRef<(text: string) => void>(() => {});

  /** Run something through the interpreter once; repeats within a few seconds are no-ops. */
  const handle = useCallback((text: string): string | null => {
    const reply = tryInterpret(text, actions);
    if (reply) last.current = { at: Date.now(), reply };
    return reply;
  }, [actions]);

  /** Wraps a client tool so it doesn't repeat an action the app just did for the same request. */
  const once = useCallback(<T,>(fn: (p: T) => string) => async (p: T) => {
    if (Date.now() - last.current.at < 8000) return `Already done: ${last.current.reply}`;
    const reply = fn(p);
    last.current = { at: Date.now(), reply };
    return reply;
  }, []);

  const conversation = useConversation({
    onConnect: () => {
      tellAgent.current(HOUSE_RULES);
      actions.toast("Live with the Manager. Just say what you need.");
    },
    onError: (e) => {
      console.error("voice error", e);
      actions.toast("Voice connection failed. Check the mic permission and the agent ID.");
    },
    onMessage: (m) => {
      if (m.role !== "user") {
        actions.voiceTranscript("agent", m.message);
        return;
      }
      actions.voiceTranscript("user", m.message);
      const reply = handle(m.message);
      if (reply) {
        actions.voiceReply(reply);
        tellAgent.current(`The app already did this: ${reply} Confirm it to the user in one short sentence. Do not call a tool for it and do not ask for confirmation.`);
      }
    },
    // Live caption while you talk. Needs "tentative_user_transcript" turned on under the
    // agent's client events in the ElevenLabs dashboard.
    onIncomingEvent: (e) => {
      if (e?.type === "tentative_user_transcript") actions.voiceInterim(String(e.tentative_user_transcription_event?.user_transcript ?? ""));
    },
    clientTools: {
      eighty_six_dish: once(({ name }: { name: string }) => actions.eightySix(String(name), "Voice")),
      add_supplier: once(({ name, item, rate }: { name: string; item: string; rate: string }) => actions.addSupplier(String(name), String(item), String(rate), "Voice")),
      update_price: once(({ item, new_price }: { item: string; new_price: string }) => actions.updatePrice(String(item), String(new_price), "Voice")),
      add_dish: once(({ name, ingredients, price }: { name: string; ingredients: string; price?: number }) => actions.addDish(String(name), String(ingredients), "Voice", Number(price) || 20)),
      get_grocery_list: async () => actions.groceryList(),
      request_order_approval: once(({ order_summary }: { order_summary: string }) => actions.requestApproval(String(order_summary), "Voice")),
      log_waste: once(({ item, quantity, reason }: { item: string; quantity: number; reason?: string }) => actions.logWaste(String(item), Number(quantity) || 1, reason ? String(reason) : "dropped", "Voice")),
      add_to_shopping_list: once(({ items }: { items: string }) => actions.addShopping(String(items), "Voice")),
      kitchen_command: once(({ command }: { command: string }) => tryInterpret(String(command), actions) ?? "I couldn't do that one."),
    },
  });

  const { status, isSpeaking } = conversation;
  useEffect(() => {
    actions.voiceLive(status, isSpeaking);
  }, [actions, status, isSpeaking]);

  useEffect(() => {
    tellAgent.current = (text: string) => {
      try {
        conversation.sendContextualUpdate(text);
      } catch {
        /* not connected */
      }
    };
  }, [conversation]);

  const live = status === "connected" || status === "connecting";
  const toggle = useCallback(() => {
    if (live) {
      conversation.endSession();
      return;
    }
    stopSpeaking();
    conversation.startSession({ agentId: AGENT_ID });
  }, [conversation, live]);

  return (
    <button className={`voice-btn ${live ? "on" : ""}`} onClick={toggle} aria-label={live ? "End live voice" : "Talk to the Manager live"} title={live ? "End live voice" : "Talk live (ElevenLabs)"}>
      {live ? <MicOff size={24} strokeWidth={2.4} /> : <Mic size={24} strokeWidth={2.4} />}
    </button>
  );
}
