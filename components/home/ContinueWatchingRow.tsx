import { useEffect, useState } from "react";

import type { HistoryEntry } from "@/lib/db/types";
import { listHistory, removeFromHistory } from "@/lib/api/history";
import { isSameTitle, selectContinueWatching } from "@/lib/history/continueWatching";
import { canSkipServerLookup, readContinueState, writeContinueState } from "@/lib/history/continueState";
import { useAuth } from "@/components/auth/AuthProvider";
import { ContentRow } from "@/components/content/ContentRow";
import { ContinueWatchingCard } from "@/components/home/ContinueWatchingCard";

const SCROLLER_CLASS = "pt-3 pb-4 -my-3 px-3 -mx-3";

export function ContinueWatchingRow() {
  const { user, isLoading } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    // Wait for the session, otherwise a signed-in user briefly sees the local guest list.
    if (isLoading) return;

    let isCurrent = true;

    const loadHistory = () => {
      // Signed-in users who recently had no history skip the server request; saving progress clears this.
      if (user && canSkipServerLookup(readContinueState(), Date.now())) return;

      listHistory(Boolean(user)).then((data) => {
        if (!isCurrent) return;
        setEntries(data);
        setHasFetched(true);
      });
    };

    loadHistory();

    window.addEventListener("cineby:profile-change", loadHistory);
    window.addEventListener("cineby:history-change", loadHistory);

    return () => {
      isCurrent = false;
      window.removeEventListener("cineby:profile-change", loadHistory);
      window.removeEventListener("cineby:history-change", loadHistory);
    };
  }, [user, isLoading]);

  const items = selectContinueWatching(entries);

  useEffect(() => {
    if (hasFetched) writeContinueState(items.length > 0);
  }, [hasFetched, items.length]);

  // History holds one entry per episode: removing a title clears all of its entries.
  const handleRemove = async (entry: HistoryEntry) => {
    const sameTitle = entries.filter((other) => isSameTitle(other, entry));
    const results = await Promise.all(sameTitle.map((other) => removeFromHistory(other.id, Boolean(user))));

    if (results.every(Boolean)) {
      setEntries((prev) => prev.filter((other) => !isSameTitle(other, entry)));
    }
  };

  // The slot holds the row's space (see .continue-slot) while history loads, so the page does not jump.
  return (
    <div className="continue-slot">
      {items.length > 0 ? (
        <ContentRow title="Continue watching" scrollerClassName={SCROLLER_CLASS}>
          {items.map((item) => (
            <ContinueWatchingCard key={item.id} entry={item} onRemove={handleRemove} />
          ))}
        </ContentRow>
      ) : null}
    </div>
  );
}
