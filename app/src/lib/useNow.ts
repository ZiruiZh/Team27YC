import { useEffect, useState } from "react";
import { demoNow } from "../data/mock";

/** Re-renders every `ms` with the demo clock. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(demoNow());
  useEffect(() => {
    const id = window.setInterval(() => setNow(demoNow()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
