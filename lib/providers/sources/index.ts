import type { Provider } from "../types";
import { vidyProvider } from "./vidy";
import { cinezoProvider } from "./cinezo";
import { vixsrcProvider } from "./vixsrc";

// Active provider list (Vidy is default and primary)
export const ALL_PROVIDERS: Provider[] = [
  vidyProvider,
  cinezoProvider,
  vixsrcProvider,
];

