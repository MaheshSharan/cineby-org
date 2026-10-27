export interface VidyServerConfig {
  id: string;
  name: string;
  endpoint: string;
  audioLanguage: string;
  audioLabel: string;
  description: string;
  languageParam?: string;
  useGermanAltTitle?: boolean;
}

export const VIDY_SERVERS: VidyServerConfig[] = [
  {
    id: "miami",
    name: "Server 1 - Miami",
    endpoint: "miami/sources",
    audioLanguage: "en",
    audioLabel: "English (Original)",
    description: "Original audio · Fast HLS / 4K",
  },
  {
    id: "boise",
    name: "Server 1 - Boise",
    endpoint: "boise/sources",
    audioLanguage: "en",
    audioLabel: "English (Original)",
    description: "Original audio · High Bitrate HLS",
  },
  {
    id: "atlanta",
    name: "Server 1 - Atlanta",
    endpoint: "atlanta/sources",
    audioLanguage: "en",
    audioLabel: "English (Original)",
    description: "Original audio · Alternate HLS",
  },
  {
    id: "seattle",
    name: "Server 1 - Seattle",
    endpoint: "seattle/sources",
    audioLanguage: "en",
    audioLabel: "English (Original)",
    description: "Original audio · Fast HLS",
  },
  {
    id: "denver",
    name: "Server 1 - Denver",
    endpoint: "denver/sources",
    audioLanguage: "en",
    audioLabel: "English (Original)",
    description: "Original audio · DASH / HLS",
  },
  {
    id: "phoenix",
    name: "Server 1 - Phoenix",
    endpoint: "phoenix/sources",
    audioLanguage: "en",
    audioLabel: "English (Original)",
    description: "Original audio · Alternate HLS",
  },
  {
    id: "portland",
    name: "Server 1 - Portland",
    endpoint: "portland/sources",
    audioLanguage: "en",
    audioLabel: "English (Original)",
    description: "Original audio · Alternate HLS",
  },
  {
    id: "austin",
    name: "Server 1 - Austin",
    endpoint: "austin/sources",
    audioLanguage: "en",
    audioLabel: "English (Original)",
    description: "Original audio · English stream",
  },
  {
    id: "dallas",
    name: "Server 1 - Dallas",
    endpoint: "dallas/sources",
    audioLanguage: "en",
    audioLabel: "English (Original)",
    description: "Original audio · Alternate HLS",
  },
  {
    id: "tampa",
    name: "Server 1 - Tampa",
    endpoint: "tampa/sources",
    audioLanguage: "en",
    audioLabel: "English (Original)",
    description: "Original audio · Fast HLS",
  },
  {
    id: "orlando",
    name: "Server 1 - Orlando",
    endpoint: "orlando/sources",
    audioLanguage: "en",
    audioLabel: "English (Original)",
    description: "Original audio · Fast HLS",
  },
  {
    id: "munich",
    name: "Server 1 - Munich",
    endpoint: "munich/sources",
    audioLanguage: "de",
    audioLabel: "German (Deutsch)",
    description: "German dubbed audio",
    languageParam: "german",
  },
  {
    id: "berlin",
    name: "Server 1 - Berlin",
    endpoint: "berlin/sources",
    audioLanguage: "de",
    audioLabel: "German (Deutsch)",
    description: "German dubbed audio",
    useGermanAltTitle: true,
  },
  {
    id: "paris",
    name: "Server 1 - Paris",
    endpoint: "paris/sources",
    audioLanguage: "fr",
    audioLabel: "French (Français)",
    description: "French dubbed audio",
  },
  {
    id: "delhi",
    name: "Server 1 - Delhi",
    endpoint: "delhi/sources",
    audioLanguage: "hi",
    audioLabel: "Hindi (हिंदी)",
    description: "Hindi dubbed audio",
  },
  {
    id: "cancun",
    name: "Server 1 - Cancun",
    endpoint: "cancun/sources",
    audioLanguage: "es",
    audioLabel: "Spanish (Español)",
    description: "Spanish dubbed audio",
  },
];
