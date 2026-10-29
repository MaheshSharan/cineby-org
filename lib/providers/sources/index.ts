import type { Provider } from "../types";
import { vidyProvider } from "./vidy";
import { vixsrcProvider } from "./vixsrc";

// Active provider list (restricted to Vidy and Vixsrc)
export const ALL_PROVIDERS: Provider[] = [
  vidyProvider,
  vixsrcProvider,
];

