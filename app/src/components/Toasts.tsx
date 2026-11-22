import { useKitchen } from "../state/kitchen";

export function Toasts() {
  const { state } = useKitchen();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {state.toasts.map((t) => (
        <div key={t.id} className="toast">{t.text}</div>
      ))}
    </div>
  );
}
