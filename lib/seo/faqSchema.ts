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
    question: "Do I need to create an account to stream on Cineby?",
    answer:
      "No account is required to stream. You can start watching instantly as a guest. Creating a free account lets you sync your custom watchlist and save playback history across all your devices.",
  },
  {
    question: "How frequently is content updated on Cineby?",
    answer:
      "Our catalog is updated daily with the latest theatrical releases, trending series episodes, and upcoming movie titles directly synchronized with TMDB and streaming providers.",
  },
  {
    question: "Can I watch Cineby on mobile phones and Smart TVs?",
    answer:
      "Yes. Cineby is fully responsive and optimized as a Progressive Web App (PWA) with installable support for iOS, Android, tablets, and desktop browsers.",
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
