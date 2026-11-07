import { JsonLdData } from "@/lib/seo/jsonLd";

export interface FaqItem {
  question: string;
  answer: string;
}

export const HOME_FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is Cineby?",
    answer:
      "Cineby is a free movie and TV streaming site at cineby.group. You can browse trending, top-rated and upcoming titles, read details, cast and trailers, and start watching without a subscription.",
  },
  {
    question: "What is the official Cineby website?",
    answer:
      "The official Cineby website is cineby.group. The earlier Cineby sites shut down in August 2026, and Cineby relaunched in November 2026 at cineby.group.",
  },
  {
    question: "Are cineby.gd, cineby.ws and cineby.rocks the same as Cineby?",
    answer:
      "No. Cineby does not operate cineby.gd, cineby.ws, cineby.rocks or other addresses and apps that copy the name. Use cineby.group and bookmark it.",
  },
  {
    question: "Is Cineby free to watch movies and TV shows?",
    answer:
      "Yes. Cineby is free to browse and watch, with no monthly subscription or credit card.",
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
    question: "What should I do if a stream or video server buffers?",
    answer:
      "Cineby provides multiple high-speed stream servers. If a server buffers, simply click the Server Selector on the player to switch to another mirror (Server 1, Server 2, or Server 3) for uninterrupted playback.",
  },
  {
    question: "Is Cineby back online in 2026? What happened to the old site?",
    answer:
      "Yes, Cineby is online. The original Cineby sites and related mirrors shut down in August 2026. Cineby relaunched in November 2026 at cineby.group, which is now the official home. The relaunched site runs on Cloudflare, works in any browser without registration, and can be installed as a Progressive Web App on phones and Smart TVs.",
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
