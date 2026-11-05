import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import type { MovieDetails, TvDetails } from "@/lib/tmdb";
import { isAbortError } from "@/lib/api/client";
import { getMediaDetails } from "@/lib/api/tmdb";

type MediaType = "movie" | "tv";
type DetailData = MovieDetails | TvDetails;

interface OpenModalParams {
  mediaType: MediaType;
  id: number;
}

interface DetailModalContextType {
  isOpen: boolean;
  mediaType: MediaType | null;
  mediaId: number | null;
  details: DetailData | null;
  isLoading: boolean;
  error: string | null;
  openDetailModal: (params: OpenModalParams) => void;
  closeDetailModal: () => void;
}

const DetailModalContext = createContext<DetailModalContextType | undefined>(undefined);

export function DetailModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [mediaId, setMediaId] = useState<number | null>(null);
  const [details, setDetails] = useState<DetailData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const closeDetailModal = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsOpen(false);
    setMediaType(null);
    setMediaId(null);
    setDetails(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const openDetailModal = useCallback(({ mediaType: type, id }: OpenModalParams) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsOpen(true);
    setMediaType(type);
    setMediaId(id);
    setDetails(null);
    setError(null);
    setIsLoading(true);

    getMediaDetails<DetailData>(type, id, controller.signal)
      .then((data) => {
        setDetails(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load details");
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      closeDetailModal();
    };

    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router, closeDetailModal]);

  const contextValue = useMemo<DetailModalContextType>(
    () => ({
      isOpen,
      mediaType,
      mediaId,
      details,
      isLoading,
      error,
      openDetailModal,
      closeDetailModal,
    }),
    [
      isOpen,
      mediaType,
      mediaId,
      details,
      isLoading,
      error,
      openDetailModal,
      closeDetailModal,
    ]
  );

  return (
    <DetailModalContext.Provider value={contextValue}>
      {children}
    </DetailModalContext.Provider>
  );
}

export function useDetailModal(): DetailModalContextType {
  const context = useContext(DetailModalContext);
  if (!context) {
    throw new Error("useDetailModal must be used within a DetailModalProvider");
  }
  return context;
}
