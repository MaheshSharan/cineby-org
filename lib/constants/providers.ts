export interface StreamingProvider {
  id: number;
  name: string;
  logo: string;
}

export const STREAMING_PROVIDERS: StreamingProvider[] = [
  { id: 8, name: "Netflix", logo: "/assets/providers/netflix.png" },
  { id: 9, name: "Prime Video", logo: "/assets/providers/prime.png" },
  { id: 337, name: "Disney+", logo: "/assets/providers/disney.png" },
  { id: 350, name: "Apple TV+", logo: "/assets/providers/apple.png" },
  { id: 1899, name: "HBO Max", logo: "/assets/providers/max.png" },
  { id: 15, name: "Hulu", logo: "/assets/providers/hulu.png" },
  { id: 531, name: "Paramount+", logo: "/assets/providers/paramount.png" },
  { id: 386, name: "Peacock", logo: "/assets/providers/peacock.png" },
  { id: 283, name: "Crunchyroll", logo: "/assets/providers/crunchyroll.png" },
  { id: 43, name: "Starz", logo: "/assets/providers/starz.png" },
  { id: 526, name: "AMC+", logo: "/assets/providers/amc.png" },
  { id: 34, name: "MGM+", logo: "/assets/providers/mgm.png" },
  { id: 188, name: "YouTube Premium", logo: "/assets/providers/youtube_premium.png" },
  { id: 73, name: "Tubi", logo: "/assets/providers/tubi.png" },
  { id: 300, name: "Pluto TV", logo: "/assets/providers/pluto.png" },
];

export const PROVIDERS_LIST = STREAMING_PROVIDERS;
export type ProviderItem = StreamingProvider;
