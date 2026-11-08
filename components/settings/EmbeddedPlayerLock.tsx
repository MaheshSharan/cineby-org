import type { ReactNode } from "react";

interface EmbeddedPlayerLockProps {
  children: ReactNode;
}

/**
 * Playback and subtitle options only applied to the old self-hosted player; the embedded players ignore them.
 * The panel stays visible but cannot be changed.
 */
export function EmbeddedPlayerLock({ children }: EmbeddedPlayerLockProps) {
  return (
    <>
      <p className="mb-4 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60">
        These options are unavailable while Cineby uses embedded players. Each server controls its own playback and
        subtitles.
      </p>
      <fieldset disabled aria-disabled="true" className="pointer-events-none select-none opacity-40">
        {children}
      </fieldset>
    </>
  );
}
