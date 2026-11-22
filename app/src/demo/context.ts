import { createContext, useContext } from "react";

export interface DemoApi {
  active: boolean;
  start: (autoplay?: boolean) => void;
  stop: () => void;
}

export const DemoContext = createContext<DemoApi>({ active: false, start: () => {}, stop: () => {} });
export const useDemo = () => useContext(DemoContext);
