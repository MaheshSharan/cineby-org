import type { Provider } from "../types";
import { vidyProvider } from "./vidy";
import { cinejoyProvider } from "./cinejoy";
import { cinezoProvider } from "./cinezo";
import { vixsrcProvider } from "./vixsrc";

// Active provider list (Cinejoy is primary top-priority, followed by Vidy)
export const ALL_PROVIDERS: Provider[] = [
  cinejoyProvider,
  vidyProvider,
  cinezoProvider,
  vixsrcProvider,
];
