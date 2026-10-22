import { useEffect } from "react";

import { isDevtoolsGuardEnabled } from "@/lib/env/public";
import { isDesktopBrowser, redirectToBlankPage, startDevtoolsGuard } from "@/lib/security/devtoolsGuard";

/** Runs the DevTools guard in production builds, on desktop browsers only, while the env flag is on. */
export function useDevtoolsGuard(): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !isDevtoolsGuardEnabled() || !isDesktopBrowser()) {
      return;
    }

    return startDevtoolsGuard(redirectToBlankPage);
  }, []);
}
