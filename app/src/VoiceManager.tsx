import { useConversation } from "@elevenlabs/react";
import { useCallback } from "react";

const AGENT_ID = "agent_7701m826461tf5y9qty5ghbjhhqn";

export function VoiceManager() {
  const conversation = useConversation({
    onError: (e) => console.error("voice error", e),
    clientTools: {
      eighty_six_dish: async ({ name }) => {
        // TODO: cross the dish off the menu board
        return `${name} is 86'd and off the menu.`;
      },
      add_supplier: async ({ name, item, rate }) => {
        // TODO: save to supplier registry
        return `Saved ${name} as your ${item} supplier at ${rate}.`;
      },
      update_price: async ({ item, new_price }) => {
        // TODO: update price in state
        return `${item} is now ${new_price}.`;
      },
      add_dish: async ({ name, ingredients }) => {
        // TODO: add dish to menu
        return `${name} added to the menu with ${ingredients}.`;
      },
      get_grocery_list: async () => {
        // TODO: return the real list from state
        return "Daily: fish, milk. Bulk: rice, oil. Weekly: spices.";
      },
      request_order_approval: async ({ order_summary }) => {
        // TODO: show approval popup, wait for human yes/no
        return `Approval requested for: ${order_summary}. Waiting for the boss.`;
      },
    },
  });

  const start = useCallback(async () => {
    await conversation.startSession({ agentId: AGENT_ID });
  }, [conversation]);

  return (
    <button onClick={conversation.status === "connected" ? conversation.endSession : start}>
      {conversation.status === "connected" ? "Stop talking" : "Talk to the Manager"}
    </button>
  );
}
