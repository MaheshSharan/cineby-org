import { JsonLdData } from "@/lib/seo/jsonLd";

export interface FaqItem {
  question: string;
  answer: string;
}

export const HOME_FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is Cineby?",
    answer:
      "Cineby is a modern streaming catalog and discovery platform that lets you explore trending movies, top-rated TV series, cast profiles, and official trailers with zero subscription fees.",
  },
  {
    question: "Is Cineby free to watch movies and TV shows?",
    answer:
      "Yes, Cineby is 100% free to browse and stream. You can watch movies and TV shows online in full HD without paying any monthly subscription or hidden fees.",
  },
  {
    question: "Is Cineby a good alternative to PStream, BFlix, or Hurawatch?",
    answer:
      "Yes. Cineby is widely regarded as a top PStream alternative, BFlix alternative, and Hurawatch alternative. It offers high-speed Cloudflare edge playback, adaptive 1080p stream mirrors, and zero registration requirements so you can stream without downtime or interruptions.",
  },
  {
    question: "Do I need to create an account to stream on Cineby?",
    answer:
      "No account or sign up is required to stream. Cineby offers free movie streaming with no sign up or credit card. You can start watching instantly as a guest, or optionally create a free account to sync custom watchlists and resume progress across devices.",
  },
  {
    question: "How frequently is content updated on Cineby?",
    answer:
      "Our catalog is updated daily with the latest theatrical releases, trending series episodes, and upcoming movie titles directly synchronized with TMDB and streaming providers.",
  },
  {
    question: "Can I watch Cineby on mobile phones and Smart TVs?",
    answer:
      "Yes. Cineby is fully responsive and optimized as a Progressive Web App (PWA) with installable support for iOS, Android, tablets, and desktop browsers. You can stream directly on Android TV, Google TV, Samsung Tizen, LG webOS, and Firestick without needing third-party hardware.",
  },
  {
    question: "Is there an official Cineby app download or APK?",
    answer:
      "Cineby is designed as an ultra-fast Progressive Web App (PWA). You do not need to download shady APK files that compromise your security. Simply visit cineby.group on Chrome or Safari and tap 'Add to Home Screen' or 'Install Cineby' to get a native app experience with zero storage overhead.",
  },
  {
    question: "How Cineby compares to Beflix, Cine97, & Cinego?",
    answer:
      "Cineby is widely recommended on Reddit movie streaming communities as a clean, ad-light alternative to legacy sites like Beflix, Cine97, Cosmos, Cinego, and Dorawatch. Cineby offers faster Cloudflare edge loading, multi-server redundancy, 1080p HD playback, and full cross-device watchlist sync.",
  },
  {
    question: "What should I do if a stream or video server buffers?",
    answer:
      "Cineby provides multiple high-speed stream servers. If a server buffers, simply click the Server Selector on the player to switch to another mirror (Server 1, Server 2, or Server 3) for uninterrupted playback.",
  },
];

/**
 * Builds Schema.org FAQPage JSON-LD for rich snippets in Google SERPs.
 */
export function buildFaqJsonLd(items: FaqItem[] = HOME_FAQ_ITEMS): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
